export {
	compareSemverVersion,
	parseSemverVersion,
	resolveActiveVersionId,
	semverSortKey,
	type ActiveVersionCandidate,
	type SemverVersion,
} from "#/lib/tracker/active-version";

export {
	trackerBugToPublicBug,
	trackerTaskToRoadmapTask,
	rowToGithubIssueLink,
	rowToTrackerBug,
	rowToTrackerDeliverable,
	rowToTrackerTask,
	rowToTrackerVersion,
} from "#/lib/tracker/mappers";

export {
	isBugInGithubSyncScope,
	isTaskInGithubSyncScope,
} from "#/lib/tracker/sync-scope";

export {
	parseTrackerTaskEntityId,
	trackerTaskEntityId,
	type GithubIssueLink,
	type GithubSyncOperation,
	type GithubSyncOutboxEntry,
	type GithubSyncState,
	type TrackerBug,
	type TrackerBugRow,
	type TrackerBugWithLink,
	type TrackerDeliverable,
	type TrackerEntityType,
	type TrackerTask,
	type TrackerTaskRow,
	type TrackerTaskSpecRelation,
	type TrackerTaskSubtask,
	type TrackerTaskWithLink,
	type TrackerVersion,
	type TrackerWorkstream,
} from "#/lib/tracker/types";

export {
	countTrackerBugs,
	getTrackerBug,
	listTrackerBugs,
	listTrackerBugsWithLinks,
	upsertTrackerBug,
	applyInboundTrackerBug,
	type UpsertTrackerBugInput,
	type ApplyInboundTrackerBugInput,
} from "#/lib/tracker/repositories/bugs-repository";

export {
	deleteGithubIssueLink,
	getGithubIssueLink,
	getGithubIssueLinkByNumber,
	listGithubIssueLinks,
	upsertGithubIssueLink,
	type UpsertGithubIssueLinkInput,
} from "#/lib/tracker/repositories/github-links-repository";

export {
	countGithubSyncOutbox,
	deleteGithubSyncOutboxEntry,
	enqueueGithubSync,
	listGithubSyncOutbox,
	markGithubSyncAttempt,
	type EnqueueGithubSyncInput,
} from "#/lib/tracker/repositories/outbox-repository";

export {
	deleteSyncSetting,
	getSyncSetting,
	getSyncSettingBoolean,
	listSyncSettings,
	setSyncSetting,
	SYNC_SETTING_KEYS,
} from "#/lib/tracker/repositories/sync-settings-repository";

export {
	getTrackerTask,
	listTrackerDeliverables,
	listTrackerTasks,
	listTrackerTasksWithLinks,
	upsertTrackerDeliverable,
	upsertTrackerTask,
	upsertTrackerWorkstream,
	applyInboundTrackerTask,
	type ApplyInboundTrackerTaskInput,
} from "#/lib/tracker/repositories/tasks-repository";

export {
	getTrackerVersion,
	listTrackerVersions,
	upsertTrackerVersion,
} from "#/lib/tracker/repositories/versions-repository";

export {
	upsertParsedSeedBundle,
	upsertParsedSeedBundles,
	type CatalogImportSummary,
} from "#/lib/tracker/import-catalog";

export {
	hasTrackerCatalogData,
	loadAllVersionSeedsFromDb,
	loadVersionSeedFromDb,
} from "#/lib/tracker/load-from-db";

export {
	backfillFromGithubMirror,
	type BackfillFromGithubSummary,
} from "#/lib/tracker/backfill-from-github";

export {
	buildRoadmapColumns,
	fetchPublicBugStats,
	getRoadmapIssue,
	hasTrackerData,
	listAllRoadmapTasks,
	listPublicBugs,
	listRoadmapBoard,
	listVersionLabels,
} from "#/lib/tracker/read-service";

export {
	createRoadmapTask,
	getRoadmapTaskByIssueNumber,
	moveRoadmapTaskToColumn,
	updateRoadmapTask,
	type CreateRoadmapTaskInput,
	type TaskRef,
	type UpdateRoadmapTaskInput,
} from "#/lib/tracker/task-service";

export {
	createPublicBug,
	type CreatePublicBugInput,
} from "#/lib/tracker/bug-service";

export {
	processGithubSyncOutboxEntries,
	type GithubExportResult,
} from "#/lib/tracker/github-export-service";

export {
	applyGithubIssueInbound,
	type GithubInboundResult,
} from "#/lib/tracker/github-inbound-service";

export { drainGithubSyncOutbox } from "#/lib/tracker/process-outbox";

export {
	getTrackerSyncSettings,
	updateTrackerSyncSettings,
	resolveTrackerActiveVersionId,
	markTrackerExportCompleted,
	markTrackerInboundCompleted,
	type TrackerSyncSettings,
	type UpdateTrackerSyncSettingsInput,
} from "#/lib/tracker/sync-settings";
