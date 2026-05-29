import { createPublicBugIssue } from "#/lib/github/issues-service";
import {
	fetchPublicBugStatsFromStore,
	listPublicBugsFromStore,
} from "#/lib/issues/read-service";
import { readSyncState } from "#/lib/storage/issues-repository";
import { triggerBoardSyncPull } from "#/lib/sync/board-sync-service";

export {
	createPublicBugIssue,
	listPublicBugsFromStore,
	fetchPublicBugStatsFromStore,
	readSyncState,
	triggerBoardSyncPull,
};

export function syncStatusMessage(): string | undefined {
	const state = readSyncState();
	if (state.lastError && state.openIssueCount === 0) {
		return `Issue sync failed: ${state.lastError}. Set GITHUB_SYNC_TOKEN or GITHUB_PUBLIC_READ_TOKEN and run bun run sync:issues.`;
	}
	return undefined;
}
