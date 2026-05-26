import type { Octokit } from "@octokit/rest";
import { getRequest } from "@tanstack/react-start/server";

import { createOctokit, createPublicReadOctokit } from "#/lib/github/octokit";
import { getSessionFromRequest } from "#/lib/session/cookie";

/** Prefer signed-in user token, then optional PAT, then unauthenticated. */
export async function createGitHubReadOctokit(): Promise<Octokit> {
	const request = getRequest();
	const session = await getSessionFromRequest(request);
	if (session?.accessToken) {
		return createOctokit(session.accessToken);
	}
	return createPublicReadOctokit();
}
