/**
 * @deprecated Import from `#/lib/sync/board-sync-service` instead.
 * Re-exports preserve existing call sites.
 */
export {
	type BoardSyncPullResult as IssuesSyncResult,
	ensureBoardSyncedReady as ensureIssuesSyncedReady,
	runBoardSyncPull as runGitHubIssuesSync,
	triggerBoardSyncPull as triggerGitHubIssuesSync,
} from "#/lib/sync/board-sync-service";
