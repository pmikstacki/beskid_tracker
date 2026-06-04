import "@tanstack/react-start/server-only";

import type { Octokit } from "@octokit/rest";

import {
	DEFAULT_DELIVERY_VERSIONS,
	isDeliveryVersionId,
	versionFromMilestoneTitle,
} from "#/lib/github/roadmap-labels";
import { repoParams } from "#/lib/github/octokit";

export interface VersionMilestone {
	number: number;
	title: string;
}

export async function listRepoMilestones(
	octokit: Octokit,
): Promise<VersionMilestone[]> {
	const { data } = await octokit.issues.listMilestones({
		...repoParams(),
		state: "all",
		per_page: 100,
	});
	return data
		.filter((m) => versionFromMilestoneTitle(m.title))
		.map((m) => ({
			number: m.number,
			title: m.title.trim(),
		}));
}

export async function ensureVersionMilestone(
	octokit: Octokit,
	versionId: string,
): Promise<VersionMilestone> {
	if (!isDeliveryVersionId(versionId)) {
		throw new Error(`Invalid delivery version id: ${versionId}`);
	}

	const existing = (await listRepoMilestones(octokit)).find(
		(m) => m.title === versionId,
	);
	if (existing) return existing;

	const { data } = await octokit.issues.createMilestone({
		...repoParams(),
		title: versionId,
		description: `Roadmap delivery band ${versionId}`,
	});
	return { number: data.number, title: data.title.trim() };
}

export async function listVersionMilestones(
	octokit: Octokit,
): Promise<string[]> {
	const fromGithub = (await listRepoMilestones(octokit)).map((m) => m.title);
	const merged = new Set([...DEFAULT_DELIVERY_VERSIONS, ...fromGithub]);
	return [...merged].sort();
}
