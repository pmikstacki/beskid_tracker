import "@tanstack/react-start/server-only";

import type { Octokit } from "@octokit/rest";

import {
	approveSpecForIssue,
	type CreateIssueInput,
	registerVersionLabel,
} from "#/lib/github/issues-service";
import type { RoadmapTask } from "#/lib/github/types";
import { drainGithubSyncOutbox } from "#/lib/tracker/process-outbox";
import {
	createRoadmapTask,
	type CreateRoadmapTaskInput,
} from "#/lib/tracker/task-service";

export { approveSpecForIssue, registerVersionLabel };

export async function createRoadmapIssueForSession(
	octokit: Octokit,
	input: CreateIssueInput & {
		componentId: string;
		subcomponentId: string;
	},
): Promise<RoadmapTask> {
	const taskInput: CreateRoadmapTaskInput = {
		title: input.title,
		body: input.body,
		priority: input.priority,
		statusColumn: input.statusColumn,
		version: input.version,
		workstream: input.workstream,
		specRelations: input.specRelations,
	};

	const task = await createRoadmapTask(taskInput);
	await drainGithubSyncOutbox(octokit).catch(() => undefined);
	return task;
}
