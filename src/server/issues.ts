import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { RoadmapColumnId } from "#/lib/github/roadmap-labels";
import {
	getRoadmapIssue,
	moveIssueToColumn,
	updateRoadmapIssue,
} from "#/lib/github/issues-service";
import type { RoadmapTask } from "#/lib/github/types";

async function withAuth<T>(
	fn: (octokit: import("@octokit/rest").Octokit) => Promise<T>,
): Promise<T> {
	const { withOctokit } = await import("#/server/auth-guard.server");
	return withOctokit(fn);
}

export const getIssue = createServerFn({ method: "GET" })
	.inputValidator((data: { issueNumber: number }) => data)
	.handler(
		async ({ data }): Promise<RoadmapTask | null> =>
			withAuth((octokit) => getRoadmapIssue(octokit, data.issueNumber)),
	);

const columnIdSchema = z.enum(["Backlog", "In Progress", "Done"]);

export const moveIssueColumn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			issueNumber: z.number().int().positive(),
			targetColumn: columnIdSchema,
		}),
	)
	.handler(
		async ({ data }): Promise<RoadmapTask> =>
			withAuth((octokit) =>
				moveIssueToColumn(
					octokit,
					data.issueNumber,
					data.targetColumn as RoadmapColumnId,
				),
			),
	);

export const updateIssue = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			issueNumber: z.number().int().positive(),
			title: z.string().min(1).max(256).optional(),
			body: z.string().max(65536).optional(),
			priority: z.enum(["high", "medium", "low"]).optional(),
			specRelations: z
				.array(
					z.object({
						path: z.string(),
						href: z.string(),
						title: z.string().optional(),
						level: z.string().optional(),
						relation: z.enum([
							"implements",
							"depends-on",
							"tracks",
							"extends",
							"validates",
						]),
						required: z.boolean(),
					}),
				)
				.optional(),
			workstream: z.string().optional(),
			subtasks: z
				.array(
					z.object({
						id: z.string(),
						text: z.string(),
						done: z.boolean(),
					}),
				)
				.optional(),
		}),
	)
	.handler(async ({ data }): Promise<RoadmapTask> => withAuth((octokit) => updateRoadmapIssue(octokit, data)));
