import { openSpecCatalogUrl } from "#/lib/platform-spec/catalog-url";
import {
	type FlatSpecNavEntry,
	searchNavEntries,
} from "#/lib/platform-spec/nav";
import { parseOpenSpecCatalogNav } from "#/lib/platform-spec/open-spec-catalog";
import { suggestPlatformSpecEntriesForTask } from "#/lib/platform-spec/suggestions";
import { trackerTaskToRoadmapTask } from "#/lib/tracker/mappers";
import { getTrackerTask } from "#/lib/tracker/repositories/tasks-repository";

const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedEntries: FlatSpecNavEntry[] | null = null;
let cachedAt = 0;

async function fetchJson(url: string): Promise<unknown> {
	const response = await fetch(url, {
		headers: { Accept: "application/json" },
	});
	if (!response.ok) {
		throw new Error(`${response.status} from ${url}`);
	}
	return response.json();
}

export async function loadNavEntries(): Promise<FlatSpecNavEntry[]> {
	const now = Date.now();
	if (cachedEntries && now - cachedAt < CACHE_TTL_MS) {
		return cachedEntries;
	}

	const url = openSpecCatalogUrl();
	try {
		const catalog = parseOpenSpecCatalogNav(await fetchJson(url));
		if (catalog.entries.length === 0) {
			throw new Error(`empty catalog from ${url}`);
		}
		cachedEntries = catalog.entries;
		cachedAt = now;
		return cachedEntries;
	} catch (error) {
		if (cachedEntries) return cachedEntries;
		const detail = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to load OpenSpec catalog: ${detail}`);
	}
}

export function searchPlatformSpecNavEntries(
	entries: FlatSpecNavEntry[],
	query: string,
	limit: number,
) {
	return searchNavEntries(entries, query, limit);
}

export async function suggestPlatformSpecNavForTask(
	versionId: string,
	taskId: string,
	limit: number,
) {
	const entries = await loadNavEntries();
	const task = getTrackerTask(versionId, taskId);
	if (!task) return [];
	const roadmapTask = trackerTaskToRoadmapTask({ ...task });
	return suggestPlatformSpecEntriesForTask(entries, roadmapTask, limit).map(
		(suggestion) => ({
			standardId: suggestion.entry.standardId,
			slug: suggestion.entry.slug,
			href: suggestion.entry.href,
			title: suggestion.entry.title,
			level: suggestion.entry.level,
			score: suggestion.score,
			matchedTerms: suggestion.matchedTerms,
			alreadyLinked: suggestion.alreadyLinked,
		}),
	);
}
