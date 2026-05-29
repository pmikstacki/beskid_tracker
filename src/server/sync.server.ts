import { importSeedBundlesToGitHub } from "#/lib/seed/import-to-github";
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
} from "#/lib/sync/sync-run-repository";
import type { SyncStatusPayload } from "#/lib/sync/sync-run-types";

export {
	readSyncState,
	getActiveSyncRun,
	listRecentSyncRuns,
	listSyncLogsForRun,
	getSyncRunById,
	listSyncLogsForRunAfter,
	triggerBoardSyncPull,
	hasGithubSyncCredentials,
	importSeedBundlesToGitHub,
	createSyncRun,
};

export function resolveSyncMode(): SyncStatusPayload["syncMode"] {
	if (isGithubSyncDisabled()) return "disabled";
	if (isGithubWebhookConfigured()) return "webhook";
	return "unconfigured";
}
