import type { Octokit } from "@octokit/rest";

import { env } from "#/env";
import { createOctokit, createPublicReadOctokit } from "#/lib/github/octokit";

/** PAT used only for background / CLI issue sync (not per-user reads). */
export function createSyncOctokit(): Octokit {
	const token =
		process.env.GITHUB_SYNC_TOKEN?.trim() || env.GITHUB_PUBLIC_READ_TOKEN;
	return token ? createOctokit(token) : createPublicReadOctokit();
}
