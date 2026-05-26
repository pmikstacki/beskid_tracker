/**
 * @deprecated Import from `#/lib/sync/board-sync-service` instead.
 * Re-exports preserve existing call sites.
 */
export {
	ensureBoardSyncedReady as ensureIssuesSyncedReady,
	runBoardSyncPull as runGitHubIssuesSync,
	triggerBoardSyncPull as triggerGitHubIssuesSync,
	type BoardSyncPullResult as IssuesSyncResult,
} from "#/lib/sync/board-sync-service";
