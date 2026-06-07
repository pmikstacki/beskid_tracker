import type { TrackerBug, TrackerTask } from "#/lib/tracker/types";

export function isTaskInGithubSyncScope(
	task: Pick<TrackerTask, "versionId">,
	activeVersionId: string | null,
): boolean {
	if (!activeVersionId) return false;
	return task.versionId === activeVersionId;
}

export function isBugInGithubSyncScope(
	_bug: Pick<TrackerBug, "id">,
): boolean {
	return true;
}
