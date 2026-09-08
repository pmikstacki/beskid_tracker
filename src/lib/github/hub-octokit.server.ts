import { Octokit } from "@octokit/rest";

import "@tanstack/react-start/server-only";

/**
 * Tracker operations are authorized by Authentik at the edge. Public roadmap
 * reads use GitHub's public API; no browser token or retired hub is involved.
 */
export function createHubOctokit(hubUserToken: string): Octokit {
	void hubUserToken;
	return new Octokit();
}
