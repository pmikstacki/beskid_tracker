import { getRoadmapIssue } from "#/lib/github/issues-service";
import {
	type FlatSpecNavEntry,
	flattenNavTree,
	type PlatformSpecNavTreeFile,
	searchNavEntries,
} from "#/lib/platform-spec/nav";
import { platformSpecNavTreeUrl } from "#/lib/platform-spec/nav-tree-url";
import { suggestPlatformSpecEntriesForIssue } from "#/lib/platform-spec/suggestions";

const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedEntries: FlatSpecNavEntry[] | null = null;
let cachedAt = 0;

export async function loadNavEntries(): Promise<FlatSpecNavEntry[]> {
	const now = Date.now();
	if (cachedEntries && now - cachedAt < CACHE_TTL_MS) {
		return cachedEntries;
	}

	const url = platformSpecNavTreeUrl();
	const response = await fetch(url, {
		headers: { Accept: "application/json" },
	});

	if (!response.ok) {
		if (cachedEntries) return cachedEntries;
		throw new Error(
			`Failed to load platform spec nav tree (${response.status}) from ${url}`,
		);
	}

	const parsed = (await response.json()) as PlatformSpecNavTreeFile;
	cachedEntries = flattenNavTree(parsed.tree);
	cachedAt = now;
	return cachedEntries;
}

export function searchPlatformSpecNavEntries(
	entries: FlatSpecNavEntry[],
	query: string,
	limit: number,
) {
	return searchNavEntries(entries, query, limit);
}

export async function suggestPlatformSpecNavForIssueNumber(
	octokit: import("@octokit/rest").Octokit,
	issueNumber: number,
	limit: number,
) {
	const entries = await loadNavEntries();
	const issue = await getRoadmapIssue(octokit, issueNumber);
	if (!issue) return [];
	return suggestPlatformSpecEntriesForIssue(entries, issue, limit).map(
		(suggestion) => ({
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
