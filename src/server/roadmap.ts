import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { canManageRoadmap } from "#/lib/github/permissions";
import type { BoardPayload } from "#/lib/github/types";
import { useSeedData } from "#/lib/seed/config";
import { resolveAuthUser } from "#/server/auth.server";
import { withAuth } from "#/server/auth-guard.server";
import * as roadmapServer from "#/server/roadmap.server";

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
				const all = roadmapServer.loadAllSeedRoadmapTasks();
				const tasks = roadmapServer.filterTasks(all, data);
				const scoped = roadmapServer.collectBoardMeta(
					all.filter((t) => t.version === data.version),
				);
				roadmapServer.assertBoardFilters(
					data,
					scoped,
					roadmapServer.catalogWorkstreamSlugs(data.version),
				);
				return {
					meta: {
						versions: roadmapServer.listSeedVersionLabels(),
						...scoped,
						canManage: false,
					},
					columns: roadmapServer.tasksToColumns(tasks),
					tasks,
				};
			});
		}
		return withAuth(async (octokit, login) => {
			const versions = await roadmapServer.listVersionLabelsFromStore();
			const { tasks, columns } =
				await roadmapServer.listRoadmapBoardFromStore(data);
			const all = await roadmapServer.listAllRoadmapTasksFromStore();
			const scoped = roadmapServer.collectBoardMeta(
				all.filter((t) => t.version === data.version),
			);
			roadmapServer.assertBoardFilters(
				data,
				scoped,
				roadmapServer.catalogWorkstreamSlugs(data.version),
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
				const all = roadmapServer.loadAllSeedRoadmapTasks();
				return {
					version: data.version,
					canManage: false,
					workstreams: roadmapServer.summarizeWorkstreams(all, data.version),
					versions: roadmapServer.listSeedVersionLabels(),
				};
			});
		}
		return withAuth(async (octokit, login) => {
			const all = await roadmapServer.listAllRoadmapTasksFromStore();
			const canManage = await canManageRoadmap(octokit, login);
			return {
				version: data.version,
				canManage,
				workstreams: roadmapServer.summarizeWorkstreams(all, data.version),
				versions: await roadmapServer.listVersionLabelsFromStore(),
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
		return withAuth((octokit) =>
			roadmapServer.createRoadmapIssue(octokit, data),
		);
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
			await roadmapServer.registerVersionLabel(octokit, data.version);
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
			return roadmapServer.approveSpecForIssue(octokit, data.issueNumber);
		});
	});

export const getSessionInfo = createServerFn({ method: "GET" }).handler(
	async () => {
		const user = await resolveAuthUser();
		if (!user) return { user: null, canManage: false };
		return withAuth(async (octokit, login) => ({
			user,
			canManage: await canManageRoadmap(octokit, login),
		}));
	},
);
