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
import type {
	RoadmapCatalog,
	RoadmapCatalogVersion,
} from "#/lib/roadmap/types";
import { loadAllSeedRoadmapTasks, loadVersionSeed } from "#/lib/seed/load";
import type { SeedTask } from "#/lib/seed/schemas";

export function buildCatalog(version?: string): RoadmapCatalog {
	return buildRoadmapCatalog(version);
}

export function assertCatalogVersion(
	catalog: RoadmapCatalog,
	versionId: string,
): RoadmapCatalogVersion {
	const version = findCatalogVersion(catalog, versionId);
	if (!version) {
		throw new RoadmapScopeNotFoundError("version", versionId, versionId);
	}
	return version;
}

export function seedTasksForVersion(versionId: string): SeedTask[] {
	try {
		return loadVersionSeed(versionId).tasks;
	} catch {
		return [];
	}
}

export function taskMatchesScope(
	task: SeedTask,
	scope: Exclude<RoadmapScopeKind, "version" | "deliverable" | "milestone">,
	slug: string,
): boolean {
	if (scope === "workstream") return task.workstream === slug;
	if (scope === "domain") return task.domain === slug;
	if (scope === "area") return task.area === slug;
	return task.feature === slug;
}

export function assertScopeSlugInVersion(
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

export function loadRoadmapSearchIndex() {
	return buildRoadmapSearchIndex();
}
