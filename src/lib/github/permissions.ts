import type { Octokit } from "@octokit/rest";

import { repoParams } from "#/lib/github/octokit";

/** Repo owner or org admin can manage versions and spec approvals. */
export async function canManageRoadmap(
	octokit: Octokit,
	login: string,
): Promise<boolean> {
	const { data: repo } = await octokit.repos.get(repoParams());

	if (repo.owner.login === login) {
		return true;
	}

	try {
		const { data: perm } = await octokit.repos.getCollaboratorPermissionLevel({
			...repoParams(),
			username: login,
		});
		return perm.permission === "admin";
	} catch {
		return false;
	}
}
