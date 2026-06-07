import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { canManageRoadmap } from "#/lib/github/permissions";
import {
	parseUploadedSeedBundles,
	type UploadedSeedFile,
} from "#/lib/seed/parse-uploaded-bundle";
import type {
	SyncLogLine,
	SyncRunRecord,
	SyncStatusPayload,
} from "#/lib/sync/sync-run-types";
import { createSyncOctokit, hasGithubSyncCredentials } from "#/lib/sync/sync-octokit";
import {
	getTrackerSyncSettings,
	updateTrackerSyncSettings,
	type TrackerSyncSettings,
	type UpdateTrackerSyncSettingsInput,
} from "#/lib/tracker/sync-settings";
import type { GithubExportResult } from "#/lib/tracker/github-export-service";
import { upsertParsedSeedBundles } from "#/lib/tracker/import-catalog";
import type { CatalogImportSummary } from "#/lib/tracker/import-catalog";
import { drainGithubSyncOutbox } from "#/lib/tracker/process-outbox";
import { requireSession, requireMaintainer, withOctokit } from "#/server/auth-guard.server";
import * as syncServer from "#/server/sync.server";

const uploadedFileSchema = z.object({
	relativePath: z.string().min(1).max(512),
	content: z.string().max(512_000),
});

export const getBoardSyncStatusFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<SyncStatusPayload> => {
		const state = syncServer.readSyncState();
		const activeRun = syncServer.getActiveSyncRun();
		const recentRuns = syncServer.listRecentSyncRuns(8);
		const logs = activeRun
			? syncServer.listSyncLogsForRun(activeRun.id, 250)
			: recentRuns[0]
				? syncServer.listSyncLogsForRun(recentRuns[0].id, 120)
				: [];

		return {
			state,
			activeRun,
			recentRuns,
			logs,
			syncMode: syncServer.resolveSyncMode(),
		};
	},
);

export interface SyncRunProgressPayload {
	run: SyncRunRecord | null;
	logs: SyncLogLine[];
	done: boolean;
}

export const getSyncRunProgressFn = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({
			runId: z.string().uuid().optional(),
			afterLogId: z.number().int().nonnegative().optional(),
		}),
	)
	.handler(async ({ data }): Promise<SyncRunProgressPayload> => {
		const run = data.runId
			? syncServer.getSyncRunById(data.runId)
			: syncServer.getActiveSyncRun();
		if (!run) {
			return { run: null, logs: [], done: true };
		}

		const logs = syncServer.listSyncLogsForRunAfter(
			run.id,
			data.afterLogId ?? 0,
			300,
		);
		return {
			run,
			logs,
			done: run.status !== "running",
		};
	});

export const triggerBoardSyncFn = createServerFn({ method: "POST" }).handler(
	async () => {
		await requireSession();
		if (!syncServer.hasGithubSyncCredentials()) {
			throw new Error(
				"Set GITHUB_SYNC_TOKEN or GITHUB_PUBLIC_READ_TOKEN to run a bootstrap sync",
			);
		}
		return syncServer.triggerBoardSyncPull(true);
	},
);

export const getSyncSettingsFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<TrackerSyncSettings> => {
		await requireMaintainer();
		return getTrackerSyncSettings();
	},
);

export const updateSyncSettingsFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			enabled: z.boolean().optional(),
			activeVersionOverride: z.string().nullable().optional(),
			exportBugs: z.boolean().optional(),
			exportActiveVersionTasks: z.boolean().optional(),
		}),
	)
	.handler(async ({ data }): Promise<TrackerSyncSettings> => {
		await requireMaintainer();
		const input: UpdateTrackerSyncSettingsInput = {
			enabled: data.enabled,
			activeVersionOverride: data.activeVersionOverride,
			exportBugs: data.exportBugs,
			exportActiveVersionTasks: data.exportActiveVersionTasks,
		};
		return updateTrackerSyncSettings(input);
	});

export const triggerGithubExportFn = createServerFn({ method: "POST" }).handler(
	async (): Promise<GithubExportResult> => {
		await requireMaintainer();
		if (!hasGithubSyncCredentials()) {
			throw new Error(
				"Set GITHUB_SYNC_TOKEN or GITHUB_PUBLIC_READ_TOKEN to export to GitHub",
			);
		}
		return drainGithubSyncOutbox(createSyncOctokit());
	},
);

export const importSeedBundleFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			files: z.array(uploadedFileSchema).min(1).max(2000),
			dryRun: z.boolean().optional(),
		}),
	)
	.handler(async ({ data }): Promise<CatalogImportSummary> => {
		const session = await requireSession();

		return withOctokit(async (octokit) => {
			if (!(await canManageRoadmap(octokit, session.login))) {
				throw new Error("Only repository maintainers can import seed data");
			}

			const bundles = parseUploadedSeedBundles(
				data.files as UploadedSeedFile[],
			);

			if (data.dryRun) {
				return {
					versionsUpserted: bundles.length,
					workstreamsUpserted: bundles.reduce(
						(sum, bundle) => sum + bundle.workstreams.length,
						0,
					),
					deliverablesUpserted: bundles.reduce(
						(sum, bundle) => sum + bundle.deliverables.length,
						0,
					),
					tasksUpserted: bundles.reduce(
						(sum, bundle) => sum + bundle.tasks.length,
						0,
					),
				};
			}

			return upsertParsedSeedBundles(bundles);
		});
	});
