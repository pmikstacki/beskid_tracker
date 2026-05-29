import type { Octokit } from "@octokit/rest";
import { getRequest } from "@tanstack/react-start/server";

import "@tanstack/react-start/server-only";

import { createHubOctokit } from "#/lib/github/hub-octokit.server";
import { createPublicReadOctokit } from "#/lib/github/octokit";
import { getSessionFromRequest } from "#/lib/session/cookie";

/** Prefer hub proxy for signed-in users, then optional PAT, then unauthenticated. */
export async function createGitHubReadOctokit(): Promise<Octokit> {
	const request = getRequest();
	const session = await getSessionFromRequest(request);
	if (session) {
		return createHubOctokit(session.hubUserToken);
	}
	return createPublicReadOctokit();
}
