import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { canManageRoadmap } from "#/lib/github/permissions";
import { importSeedBundlesToGitHub } from "#/lib/seed/import-to-github";
import {
	parseUploadedSeedBundles,
	type UploadedSeedFile,
} from "#/lib/seed/parse-uploaded-bundle";
import { readSyncState } from "#/lib/storage/issues-repository";
import { triggerBoardSyncPull } from "#/lib/sync/board-sync-service";
import {
	isGithubSyncDisabled,
	isGithubWebhookConfigured,
} from "#/lib/sync/github-webhook-config";
import { hasGithubSyncCredentials } from "#/lib/sync/sync-octokit";
import {
	createSyncRun,
	getActiveSyncRun,
	getSyncRunById,
	listRecentSyncRuns,
	listSyncLogsForRun,
	listSyncLogsForRunAfter,
	type SyncLogLine,
	type SyncRunRecord,
} from "#/lib/sync/sync-run-repository";
import type { SyncStatusPayload } from "#/lib/sync/sync-run-types";

const uploadedFileSchema = z.object({
	relativePath: z.string().min(1).max(512),
	content: z.string().max(512_000),
});

function resolveSyncMode(): SyncStatusPayload["syncMode"] {
	if (isGithubSyncDisabled()) return "disabled";
	if (isGithubWebhookConfigured()) return "webhook";
	return "unconfigured";
}

export const getBoardSyncStatusFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<SyncStatusPayload> => {
		const state = readSyncState();
		const activeRun = getActiveSyncRun();
		const recentRuns = listRecentSyncRuns(8);
		const logs = activeRun
			? listSyncLogsForRun(activeRun.id, 250)
			: recentRuns[0]
				? listSyncLogsForRun(recentRuns[0].id, 120)
				: [];

		const syncMode = resolveSyncMode();

		return {
			state,
			activeRun,
			recentRuns,
			logs,
			syncMode,
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
		const run = data.runId ? getSyncRunById(data.runId) : getActiveSyncRun();
		if (!run) {
			return { run: null, logs: [], done: true };
		}

		const logs = listSyncLogsForRunAfter(run.id, data.afterLogId ?? 0, 300);
		return {
			run,
			logs,
			done: run.status !== "running",
		};
	});

export const triggerBoardSyncFn = createServerFn({ method: "POST" }).handler(
	async () => {
		const { requireSession } = await import("#/server/auth-guard.server");
		await requireSession();
		if (!hasGithubSyncCredentials()) {
			throw new Error(
				"Set GITHUB_SYNC_TOKEN or GITHUB_PUBLIC_READ_TOKEN to run a bootstrap sync",
			);
		}
		return triggerBoardSyncPull(true);
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
		const { withOctokit, requireSession } = await import(
			"#/server/auth-guard.server"
		);
		const session = await requireSession();

		return withOctokit(async (octokit) => {
			if (!(await canManageRoadmap(octokit, session.login))) {
				throw new Error("Only repository maintainers can import seed data");
			}

			if (getActiveSyncRun()) {
				throw new Error(
					"Another sync is already running. Wait for it to finish.",
				);
			}

			const bundles = parseUploadedSeedBundles(
				data.files as UploadedSeedFile[],
			);
			const run = createSyncRun("import");
			run.log(
				`Import requested by ${session.login}: ${bundles.length} version(s), dryRun=${Boolean(data.dryRun)}`,
			);

			return importSeedBundlesToGitHub(octokit, bundles, run, {
				dryRun: data.dryRun,
			});
		});
	});
