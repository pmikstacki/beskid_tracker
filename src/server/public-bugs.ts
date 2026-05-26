import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
	fetchPublicBugStatsFromStore,
	listPublicBugsFromStore,
} from "#/lib/issues/read-service";
import { createPublicBugIssue } from "#/lib/github/issues-service";
import type { PublicBug, PublicBugStats } from "#/lib/github/types";
import { readSyncState } from "#/lib/storage/issues-repository";
import { triggerGitHubIssuesSync } from "#/lib/sync/github-issues-sync";

export interface PublicBugsPayload {
	bugs: PublicBug[];
	rateLimited: boolean;
	cached: boolean;
	message?: string;
}

export interface PublicBugStatsPayload extends PublicBugStats {
	rateLimited: boolean;
	cached: boolean;
	message?: string;
}

function syncStatusMessage(): string | undefined {
	const state = readSyncState();
	if (state.lastError && state.openIssueCount === 0) {
		return `Issue sync failed: ${state.lastError}. Set GITHUB_SYNC_TOKEN or GITHUB_PUBLIC_READ_TOKEN and run bun run sync:issues.`;
	}
	return undefined;
}

export const listPublicBugsFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<PublicBugsPayload> => {
		const state = readSyncState();
		try {
			const bugs = await listPublicBugsFromStore();
			return {
				bugs,
				rateLimited: false,
				cached: Boolean(state.lastSuccessAt),
				message: syncStatusMessage(),
			};
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to load bugs from store";
			return {
				bugs: [],
				rateLimited: true,
				cached: Boolean(state.lastSuccessAt),
				message,
			};
		}
	},
);

export const createPublicBugFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			title: z.string().min(1).max(256),
			body: z.string().max(65536).default(""),
			componentId: z.string().min(1).max(64),
			subcomponentId: z.string().min(1).max(64),
			attachments: z
				.array(
					z.object({
						name: z.string().min(1).max(256),
						contentBase64: z.string().min(1).max(3_000_000),
					}),
				)
				.max(8)
				.optional(),
		}),
	)
	.handler(async ({ data }) => {
		const { withOctokit } = await import("#/server/auth-guard.server");
		return withOctokit((octokit) => createPublicBugIssue(octokit, data));
	});

export const getPublicBugStatsFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<PublicBugStatsPayload> => {
		const state = readSyncState();
		try {
			const stats = await fetchPublicBugStatsFromStore();
			return {
				...stats,
				rateLimited: false,
				cached: Boolean(state.lastSuccessAt),
				message: syncStatusMessage(),
			};
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to load bug stats";
			return {
				open: 0,
				closed: 0,
				rateLimited: true,
				cached: Boolean(state.lastSuccessAt),
				message,
			};
		}
	},
);

export const syncIssuesFn = createServerFn({ method: "POST" }).handler(async () => {
	const { requireSession } = await import("#/server/auth-guard.server");
	await requireSession();
	return triggerGitHubIssuesSync(true);
});
