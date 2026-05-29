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
import { requireSession, withOctokit } from "#/server/auth-guard.server";
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

export const importSeedBundleFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			files: z.array(uploadedFileSchema).min(1).max(2000),
			dryRun: z.boolean().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const session = await requireSession();

		return withOctokit(async (octokit) => {
			if (!(await canManageRoadmap(octokit, session.login))) {
				throw new Error("Only repository maintainers can import seed data");
			}

			if (syncServer.getActiveSyncRun()) {
				throw new Error(
					"Another sync is already running. Wait for it to finish.",
				);
			}

			const bundles = parseUploadedSeedBundles(
				data.files as UploadedSeedFile[],
			);
			const run = syncServer.createSyncRun("import");
			run.log(
				`Import requested by ${session.login}: ${bundles.length} version(s), dryRun=${Boolean(data.dryRun)}`,
			);

			return syncServer.importSeedBundlesToGitHub(octokit, bundles, run, {
				dryRun: data.dryRun,
			});
		});
	});
