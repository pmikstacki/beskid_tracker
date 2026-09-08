import { Octokit } from "@octokit/rest";

import "@tanstack/react-start/server-only";

/**
 * Tracker operations are authorized by Authentik at the edge. GitHub calls use
 * the server-side integration credential; no browser token or retired hub is
 * involved.
 */
export function createHubOctokit(hubUserToken: string): Octokit {
	return new Octokit({
		auth: hubUserToken || undefined,
	});
}
