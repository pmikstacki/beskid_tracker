import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { collectBoardMeta } from "#/lib/github/mappers";
import type { RoadmapTask } from "#/lib/github/types";
import {
	buildRoadmapCatalog,
	findCatalogVersion,
} from "#/lib/roadmap/build-catalog";
import { buildRoadmapSearchIndex } from "#/lib/roadmap/build-search-index";
import {
	type RoadmapScopeKind,
	RoadmapScopeNotFoundError,
} from "#/lib/roadmap/scope-not-found";
import type { RoadmapSearchHit } from "#/lib/roadmap/search-index";
import type {
	RoadmapCatalog,
	RoadmapCatalogVersion,
} from "#/lib/roadmap/types";
import { loadAllSeedRoadmapTasks, loadVersionSeed } from "#/lib/seed/load";
import { compareSeedTasks, type SeedTask } from "#/lib/seed/schemas";

function assertCatalogVersion(
	catalog: RoadmapCatalog,
	versionId: string,
): RoadmapCatalogVersion {
	const version = findCatalogVersion(catalog, versionId);
	if (!version) {
		throw new RoadmapScopeNotFoundError("version", versionId, versionId);
	}
	return version;
}

function seedTasksForVersion(versionId: string): SeedTask[] {
	try {
		return loadVersionSeed(versionId).tasks;
	} catch {
		return [];
	}
}

function taskMatchesScope(
	task: SeedTask,
	scope: Exclude<RoadmapScopeKind, "version" | "deliverable" | "milestone">,
	slug: string,
): boolean {
	if (scope === "workstream") return task.workstream === slug;
	if (scope === "domain") return task.domain === slug;
	if (scope === "area") return task.area === slug;
	return task.feature === slug;
}

function assertScopeSlugInVersion(
	versionId: string,
	scope: "domain" | "area" | "feature",
	slug: string,
	tasks: SeedTask[],
): void {
	const versionTasks: RoadmapTask[] = loadAllSeedRoadmapTasks().filter(
		(t) => t.version === versionId,
	);
	const meta = collectBoardMeta(versionTasks);
	const known =
		scope === "domain"
			? meta.domains
			: scope === "area"
				? meta.areas
				: meta.features;
	if (!known.includes(slug) || tasks.length === 0) {
		throw new RoadmapScopeNotFoundError(scope, versionId, slug);
	}
}

export const getRoadmapCatalog = createServerFn({ method: "GET" })
	.inputValidator(
		z
			.object({
				version: z.string().optional(),
			})
			.optional(),
	)
	.handler(async ({ data }): Promise<RoadmapCatalog> => {
		return buildRoadmapCatalog(data?.version);
	});

export interface VersionDashboardPayload {
	version: RoadmapCatalogVersion;
	catalog: RoadmapCatalog;
	recentTasks: SeedTask[];
}

export const getVersionDashboard = createServerFn({ method: "GET" })
	.inputValidator(z.object({ version: z.string().min(1) }))
	.handler(async ({ data }): Promise<VersionDashboardPayload> => {
		const catalog = buildRoadmapCatalog(data.version);
		const version = assertCatalogVersion(catalog, data.version);
		const recentTasks = [...seedTasksForVersion(data.version)]
			.sort((a, b) => compareSeedTasks(b, a))
			.slice(0, 12);
		return { version, catalog, recentTasks };
	});

export interface DeliverableDashboardPayload {
	version: RoadmapCatalogVersion;
	deliverable: RoadmapCatalogVersion["deliverables"][number];
	tasks: SeedTask[];
	catalog: RoadmapCatalog;
}

export const getDeliverableDashboard = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({
			version: z.string().min(1),
			deliverableId: z.string().min(1),
		}),
	)
	.handler(async ({ data }): Promise<DeliverableDashboardPayload> => {
		const catalog = buildRoadmapCatalog(data.version);
		const version = assertCatalogVersion(catalog, data.version);
		const deliverable = version.deliverables.find(
			(d) => d.id === data.deliverableId,
		);
		if (!deliverable) {
			throw new RoadmapScopeNotFoundError(
				"deliverable",
				data.version,
				data.deliverableId,
			);
		}
		const tasks = seedTasksForVersion(data.version)
			.filter((t) => (t.deliverableId ?? t.milestoneId) === data.deliverableId)
			.sort(compareSeedTasks);
		return { version, deliverable, tasks, catalog };
	});

export const getMilestoneDashboard = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({
			version: z.string().min(1),
			milestoneId: z.string().min(1),
		}),
	)
	.handler(
		async ({ data }): Promise<DeliverableDashboardPayload> =>
			getDeliverableDashboard({
				data: { version: data.version, deliverableId: data.milestoneId },
			}),
	);

export interface WorkstreamDashboardPayload {
	version: RoadmapCatalogVersion;
	workstream: RoadmapCatalogVersion["workstreams"][number];
	tasks: SeedTask[];
	catalog: RoadmapCatalog;
}

export const getWorkstreamDashboard = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({
			version: z.string().min(1),
			slug: z.string().min(1),
		}),
	)
	.handler(async ({ data }): Promise<WorkstreamDashboardPayload> => {
		const catalog = buildRoadmapCatalog(data.version);
		const version = assertCatalogVersion(catalog, data.version);
		const workstream = version.workstreams.find((w) => w.slug === data.slug);
		if (!workstream) {
			throw new RoadmapScopeNotFoundError(
				"workstream",
				data.version,
				data.slug,
			);
		}
		const tasks = seedTasksForVersion(data.version)
			.filter((t) => t.workstream === data.slug)
			.sort(compareSeedTasks);
		return { version, workstream, tasks, catalog };
	});

export interface TaxonomyDashboardPayload {
	version: RoadmapCatalogVersion;
	slug: string;
	tasks: SeedTask[];
	catalog: RoadmapCatalog;
}

function taxonomyDashboard(
	versionId: string,
	scope: "domain" | "area" | "feature",
	slug: string,
): TaxonomyDashboardPayload {
	const catalog = buildRoadmapCatalog(versionId);
	const version = assertCatalogVersion(catalog, versionId);
	const tasks = seedTasksForVersion(versionId)
		.filter((t) => taskMatchesScope(t, scope, slug))
		.sort(compareSeedTasks);
	assertScopeSlugInVersion(versionId, scope, slug, tasks);
	return { version, slug, tasks, catalog };
}

export const getDomainDashboard = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({
			version: z.string().min(1),
			slug: z.string().min(1),
		}),
	)
	.handler(
		async ({ data }): Promise<TaxonomyDashboardPayload> =>
			taxonomyDashboard(data.version, "domain", data.slug),
	);

export const getAreaDashboard = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({
			version: z.string().min(1),
			slug: z.string().min(1),
		}),
	)
	.handler(
		async ({ data }): Promise<TaxonomyDashboardPayload> =>
			taxonomyDashboard(data.version, "area", data.slug),
	);

export const getFeatureDashboard = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({
			version: z.string().min(1),
			slug: z.string().min(1),
		}),
	)
	.handler(
		async ({ data }): Promise<TaxonomyDashboardPayload> =>
			taxonomyDashboard(data.version, "feature", data.slug),
	);

export const getRoadmapSearchIndex = createServerFn({ method: "GET" }).handler(
	async (): Promise<RoadmapSearchHit[]> => buildRoadmapSearchIndex(),
);
