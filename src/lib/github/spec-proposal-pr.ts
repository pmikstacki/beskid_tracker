import type { Octokit } from "@octokit/rest";

import { buildMdxFile, parseFrontmatterJson } from "#/lib/docs-spec/frontmatter";
import { env } from "#/env";
import type { SpecProposal, SpecProposalChange } from "#/lib/docs-spec/types";

const OWNER = () => env.GITHUB_REPO_OWNER;
const REPO = () => env.GITHUB_REPO_NAME;

function proposalBranchName(proposalId: string): string {
	const short = proposalId.replace(/-/g, "").slice(0, 8);
	return `docs/proposal/${short}`;
}

async function getBaseSha(octokit: Octokit, baseRef: string): Promise<string> {
	const { data } = await octokit.repos.getBranch({
		owner: OWNER(),
		repo: REPO(),
		branch: baseRef,
	});
	return data.commit.sha;
}

async function ensureBranch(
	octokit: Octokit,
	baseRef: string,
	branchName: string,
): Promise<string> {
	const baseSha = await getBaseSha(octokit, baseRef);
	try {
		await octokit.git.getRef({
			owner: OWNER(),
			repo: REPO(),
			ref: `heads/${branchName}`,
		});
		const ref = await octokit.git.getRef({
			owner: OWNER(),
			repo: REPO(),
			ref: `heads/${branchName}`,
		});
		return ref.data.object.sha;
	} catch {
		await octokit.git.createRef({
			owner: OWNER(),
			repo: REPO(),
			ref: `refs/heads/${branchName}`,
			sha: baseSha,
		});
		return baseSha;
	}
}

function fileContentForChange(change: SpecProposalChange): string | null {
	if (change.changeKind === "delete") return null;
	const frontmatter = parseFrontmatterJson(change.frontmatterJson);
	return buildMdxFile(frontmatter, change.bodyMd);
}

export interface SubmitProposalPrResult {
	branch: string;
	prNumber: number;
	prUrl: string;
}

export async function submitSpecProposalPullRequest(
	octokit: Octokit,
	proposal: SpecProposal,
	changes: SpecProposalChange[],
): Promise<SubmitProposalPrResult> {
	const branch = proposal.headBranch ?? proposalBranchName(proposal.id);
	let parentSha = await ensureBranch(octokit, proposal.baseRef, branch);

	for (const change of changes) {
		const content = fileContentForChange(change);
		const repoPath = change.repoPath;

		if (change.changeKind === "delete") {
			try {
				const existing = await octokit.repos.getContent({
					owner: OWNER(),
					repo: REPO(),
					path: repoPath,
					ref: branch,
				});
				if (!Array.isArray(existing.data) && existing.data.sha) {
					const commit = await octokit.repos.deleteFile({
						owner: OWNER(),
						repo: REPO(),
						path: repoPath,
						message: `docs(proposal): remove ${change.slug}`,
						sha: existing.data.sha,
						branch,
					});
					parentSha = commit.data.commit.sha ?? parentSha;
				}
			} catch {
				// already absent
			}
			continue;
		}

		if (!content) continue;

		let sha: string | undefined;
		try {
			const existing = await octokit.repos.getContent({
				owner: OWNER(),
				repo: REPO(),
				path: repoPath,
				ref: branch,
			});
			if (!Array.isArray(existing.data) && existing.data.sha) {
				sha = existing.data.sha;
			}
		} catch {
			sha = undefined;
		}

		const result = await octokit.repos.createOrUpdateFileContents({
			owner: OWNER(),
			repo: REPO(),
			path: repoPath,
			message: `docs(proposal): ${change.changeKind} ${change.slug}`,
			content: Buffer.from(content, "utf8").toString("base64"),
			branch,
			sha,
		});
		parentSha = result.data.commit.sha ?? parentSha;

		if (change.layoutJson) {
			const layoutPath = repoPath.replace(/\/[^/]+$/, "/layout.json");
			let layoutSha: string | undefined;
			try {
				const existingLayout = await octokit.repos.getContent({
					owner: OWNER(),
					repo: REPO(),
					path: layoutPath,
					ref: branch,
				});
				if (!Array.isArray(existingLayout.data) && existingLayout.data.sha) {
					layoutSha = existingLayout.data.sha;
				}
			} catch {
				layoutSha = undefined;
			}

			await octokit.repos.createOrUpdateFileContents({
				owner: OWNER(),
				repo: REPO(),
				path: layoutPath,
				message: `docs(proposal): layout for ${change.slug}`,
				content: Buffer.from(change.layoutJson, "utf8").toString("base64"),
				branch,
				sha: layoutSha,
			});
		}
	}

	const prBody = [
		proposal.summary,
		"",
		"## Changes",
		...changes.map(
			(c) => `- **${c.changeKind}** \`${c.repoPath}\` (${c.specLevel})`,
		),
		"",
		"_Opened from Beskid Tracker platform-spec proposal._",
	].join("\n");

	const { data: pr } = await octokit.pulls.create({
		owner: OWNER(),
		repo: REPO(),
		title: proposal.title,
		head: branch,
		base: proposal.baseRef,
		body: prBody,
	});

	return {
		branch,
		prNumber: pr.number,
		prUrl: pr.html_url,
	};
}

export async function refreshProposalPrStatus(
	octokit: Octokit,
	proposal: SpecProposal,
): Promise<SpecProposal["status"]> {
	if (!proposal.prNumber) return proposal.status;

	const { data: pr } = await octokit.pulls.get({
		owner: OWNER(),
		repo: REPO(),
		pull_number: proposal.prNumber,
	});

	if (pr.merged) return "merged";
	if (pr.state === "closed") return "closed";
	return "pr_open";
}
