import "@tanstack/react-start/server-only";

import type { Octokit } from "@octokit/rest";

import type { UpdateIssueInput } from "#/lib/github/issues-service";
import type { RoadmapColumnId } from "#/lib/github/roadmap-labels";
import type { RoadmapTask } from "#/lib/github/types";
import { drainGithubSyncOutbox } from "#/lib/tracker/process-outbox";
import {
	getRoadmapTaskByIssueNumber,
	moveRoadmapTaskToColumn,
	updateRoadmapTask,
} from "#/lib/tracker/task-service";

export async function getRoadmapIssueForSession(
	_octokit: Octokit,
	issueNumber: number,
): Promise<RoadmapTask | null> {
	return getRoadmapTaskByIssueNumber(issueNumber);
}

export async function moveIssueToColumnForSession(
	octokit: Octokit,
	issueNumber: number,
	targetColumn: RoadmapColumnId,
): Promise<RoadmapTask> {
	const task = await moveRoadmapTaskToColumn({ issueNumber }, targetColumn);
	await drainGithubSyncOutbox(octokit).catch(() => undefined);
	return task;
}

export async function updateRoadmapIssueForSession(
	octokit: Octokit,
	input: UpdateIssueInput,
): Promise<RoadmapTask> {
	const task = await updateRoadmapTask({
		issueNumber: input.issueNumber,
		title: input.title,
		body: input.body,
		priority: input.priority,
		specRelations: input.specRelations,
		subtasks: input.subtasks,
		workstream: input.workstream,
	});
	await drainGithubSyncOutbox(octokit).catch(() => undefined);
	return task;
}
