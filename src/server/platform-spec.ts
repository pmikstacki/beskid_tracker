import { createServerFn } from "@tanstack/react-start";

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

async function loadNavEntries(): Promise<FlatSpecNavEntry[]> {
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

export const searchPlatformSpecNav = createServerFn({ method: "GET" })
	.inputValidator((data: { query: string; limit?: number }) => data)
	.handler(async ({ data }): Promise<FlatSpecNavEntry[]> => {
		const entries = await loadNavEntries();
		return searchNavEntries(entries, data.query, data.limit ?? 20);
	});

async function withAuth<T>(
	fn: (octokit: import("@octokit/rest").Octokit) => Promise<T>,
): Promise<T> {
	const { withOctokit } = await import("#/server/auth-guard.server");
	return withOctokit(fn);
}

export interface IssueSpecSuggestion {
	slug: string;
	href: string;
	title: string;
	level: string;
	score: number;
	matchedTerms: string[];
	alreadyLinked: boolean;
}

export const suggestPlatformSpecNavForIssue = createServerFn({ method: "GET" })
	.inputValidator((data: { issueNumber: number; limit?: number }) => data)
	.handler(async ({ data }): Promise<IssueSpecSuggestion[]> => {
		const entries = await loadNavEntries();
		return withAuth(async (octokit) => {
			const issue = await getRoadmapIssue(octokit, data.issueNumber);
			if (!issue) return [];
			return suggestPlatformSpecEntriesForIssue(
				entries,
				issue,
				data.limit ?? 8,
			).map((suggestion) => ({
				slug: suggestion.entry.slug,
				href: suggestion.entry.href,
				title: suggestion.entry.title,
				level: suggestion.entry.level,
				score: suggestion.score,
				matchedTerms: suggestion.matchedTerms,
				alreadyLinked: suggestion.alreadyLinked,
			}));
		});
	});
