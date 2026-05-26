import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { filterTasks, summarizeWorkstreams } from "#/lib/github/filters";
import {
	approveSpecForIssue,
	createRoadmapIssue,
	registerVersionLabel,
} from "#/lib/github/issues-service";
import {
	listAllRoadmapTasksFromStore,
	listRoadmapBoardFromStore,
	listVersionLabelsFromStore,
} from "#/lib/issues/read-service";
import { collectBoardMeta } from "#/lib/github/mappers";
import { canManageRoadmap } from "#/lib/github/permissions";
import type { BoardPayload } from "#/lib/github/types";
import { catalogWorkstreamSlugs } from "#/lib/roadmap/build-catalog";
import { assertBoardFilters } from "#/lib/roadmap/validate-board-filters";
import { useSeedData } from "#/lib/seed/config";
import {
	listSeedVersionLabels,
	loadAllSeedRoadmapTasks,
	tasksToColumns,
} from "#/lib/seed/load";
import { getAuthUser } from "#/server/auth";

async function withAuth<T>(
	fn: (octokit: import("@octokit/rest").Octokit, login: string) => Promise<T>,
): Promise<T> {
	const { withOctokit, requireSession } = await import(
		"#/server/auth-guard.server"
	);
	const session = await requireSession();
	return withOctokit((octokit) => fn(octokit, session.login));
}

export const getBoard = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({
			version: z.string().min(1),
			workstream: z.string().optional(),
			domain: z.string().optional(),
			area: z.string().optional(),
			feature: z.string().optional(),
		}),
	)
	.handler(async ({ data }): Promise<BoardPayload> => {
		if (useSeedData()) {
			return withAuth(async () => {
				const all = loadAllSeedRoadmapTasks();
				const tasks = filterTasks(all, data);
				const scoped = collectBoardMeta(
					all.filter((t) => t.version === data.version),
				);
				assertBoardFilters(
					data,
					scoped,
					catalogWorkstreamSlugs(data.version),
				);
				return {
					meta: {
						versions: listSeedVersionLabels(),
						...scoped,
						canManage: false,
					},
					columns: tasksToColumns(tasks),
					tasks,
				};
			});
		}
		return withAuth(async (octokit, login) => {
			const versions = await listVersionLabelsFromStore();
			const { tasks, columns } = await listRoadmapBoardFromStore(data);
			const all = await listAllRoadmapTasksFromStore();
			const scoped = collectBoardMeta(
				all.filter((t) => t.version === data.version),
			);
			assertBoardFilters(
				data,
				scoped,
				catalogWorkstreamSlugs(data.version),
			);
			const canManage = await canManageRoadmap(octokit, login);

			return {
				meta: {
					versions,
					...scoped,
					canManage,
				},
				columns,
				tasks,
			};
		});
	});

export const getWorkstreamDashboard = createServerFn({ method: "GET" })
	.inputValidator(z.object({ version: z.string().min(1) }))
	.handler(async ({ data }) => {
		if (useSeedData()) {
			return withAuth(async () => {
				const all = loadAllSeedRoadmapTasks();
				return {
					version: data.version,
					canManage: false,
					workstreams: summarizeWorkstreams(all, data.version),
					versions: listSeedVersionLabels(),
				};
			});
		}
		return withAuth(async (octokit, login) => {
			const all = await listAllRoadmapTasksFromStore();
			const canManage = await canManageRoadmap(octokit, login);
			return {
				version: data.version,
				canManage,
				workstreams: summarizeWorkstreams(all, data.version),
				versions: await listVersionLabelsFromStore(),
			};
		});
	});

const columnIdSchema = z.enum(["Backlog", "In Progress", "Done"]);

export const createBoardIssue = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			title: z.string().min(1).max(256),
			body: z.string().max(65536).default(""),
			priority: z.enum(["high", "medium", "low"]),
			statusColumn: columnIdSchema,
			version: z.string().min(1),
			workstream: z.string().optional(),
			specRelations: z.array(
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
			),
			componentId: z.string().min(1).max(64),
			subcomponentId: z.string().min(1).max(64),
		}),
	)
	.handler(async ({ data }) => {
		if (useSeedData()) {
			throw new Error(
				"Roadmap task creation is disabled while ROADMAP_USE_SEED=1 (read-only seed catalog)",
			);
		}
		return withAuth((octokit) => createRoadmapIssue(octokit, data));
	});

export const registerVersion = createServerFn({ method: "POST" })
	.inputValidator(z.object({ version: z.string().regex(/^v\d+\.\d+$/) }))
	.handler(async ({ data }) => {
		return withAuth(async (octokit, login) => {
			if (!(await canManageRoadmap(octokit, login))) {
				throw new Error(
					"Only the repository owner can define delivery versions",
				);
			}
			await registerVersionLabel(octokit, data.version);
			return { version: data.version };
		});
	});

export const approveSpec = createServerFn({ method: "POST" })
	.inputValidator(z.object({ issueNumber: z.number().int().positive() }))
	.handler(async ({ data }) => {
		return withAuth(async (octokit, login) => {
			if (!(await canManageRoadmap(octokit, login))) {
				throw new Error("Only the repository owner can approve spec linkages");
			}
			return approveSpecForIssue(octokit, data.issueNumber);
		});
	});

export const getSessionInfo = createServerFn({ method: "GET" }).handler(
	async () => {
		const user = await getAuthUser();
		if (!user) return { user: null, canManage: false };
		return withAuth(async (octokit, login) => ({
			user,
			canManage: await canManageRoadmap(octokit, login),
		}));
	},
);
