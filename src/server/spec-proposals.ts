import { verifyProposalWorkspace } from "@cyber-nomad-collective/trudoc/verify";
import { createServerFn } from "@tanstack/react-start";

import {
	buildRepoPathFromForm,
	buildSlugFromRepoPath,
} from "#/lib/docs-spec/build-path";
import {
	formValuesToFrontmatter,
	frontmatterToFormValues,
} from "#/lib/docs-spec/form-layouts";
import {
	parseFrontmatterJson,
	validateFrontmatterForLevel,
} from "#/lib/docs-spec/frontmatter";
import {
	pathClassFromRepoPath,
	validateSpecLevelPath,
} from "#/lib/docs-spec/path-rules";
import type {
	ProposalValidationResult,
	SpecLevel,
	SpecProposalChangeKind,
} from "#/lib/docs-spec/types";
import {
	cleanupMaterializedWorkspace,
	materializeProposalWorkspace,
} from "#/lib/docs-spec/workspace-materialize";
import {
	refreshProposalPrStatus,
	submitSpecProposalPullRequest,
} from "#/lib/github/spec-proposal-pr";
import { withAuthUser } from "#/server/auth-guard.server";
import { withIssuesDb } from "#/server/spec-proposals.server";

export const listSpecProposalsFn = createServerFn({ method: "GET" }).handler(
	async () =>
		withAuthUser(async () =>
			withIssuesDb((db, { listSpecProposals }) => listSpecProposals(db)),
		),
);

export const getSpecProposalFn = createServerFn({ method: "GET" })
	.inputValidator((data: { id: string }) => data)
	.handler(async ({ data }) =>
		withAuthUser(async () =>
			withIssuesDb((db, { getSpecProposal }) => {
				const proposal = getSpecProposal(db, data.id);
				if (!proposal) throw new Error("Proposal not found");
				return proposal;
			}),
		),
	);

export const createSpecProposalFn = createServerFn({ method: "POST" })
	.inputValidator(
		(data: { title: string; summary?: string; baseRef?: string }) => data,
	)
	.handler(async ({ data }) =>
		withAuthUser(async ({ login }) =>
			withIssuesDb((db, { insertSpecProposal }) => {
				const id = crypto.randomUUID();
				return insertSpecProposal(db, {
					id,
					title: data.title.trim(),
					summary: data.summary?.trim() ?? "",
					status: "draft",
					authorLogin: login,
					baseRef: data.baseRef?.trim() || "main",
					headBranch: null,
					prNumber: null,
					prUrl: null,
					validationJson: null,
				});
			}),
		),
	);

export const updateSpecProposalMetaFn = createServerFn({ method: "POST" })
	.inputValidator(
		(data: { id: string; title?: string; summary?: string }) => data,
	)
	.handler(async ({ data }) =>
		withAuthUser(async () =>
			withIssuesDb((db, { getSpecProposal, updateSpecProposal }) => {
				const existing = getSpecProposal(db, data.id);
				if (!existing) throw new Error("Proposal not found");
				updateSpecProposal(db, data.id, {
					title: data.title?.trim(),
					summary: data.summary?.trim(),
				});
				return getSpecProposal(db, data.id);
			}),
		),
	);

export const deleteSpecProposalFn = createServerFn({ method: "POST" })
	.inputValidator((data: { id: string }) => data)
	.handler(async ({ data }) =>
		withAuthUser(async () =>
			withIssuesDb((db, { deleteSpecProposal }) => {
				deleteSpecProposal(db, data.id);
				return { ok: true };
			}),
		),
	);

export const upsertSpecProposalChangeFn = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			proposalId: string;
			changeId?: string;
			changeKind: SpecProposalChangeKind;
			specLevel: SpecLevel;
			values: Record<string, string>;
		}) => data,
	)
	.handler(async ({ data }) =>
		withAuthUser(async () =>
			withIssuesDb(
				(
					db,
					{
						getSpecProposal,
						getSpecProposalChange,
						insertSpecProposalChange,
						updateSpecProposalChange,
					},
				) => {
					const proposal = getSpecProposal(db, data.proposalId);
					if (!proposal) throw new Error("Proposal not found");
					if (proposal.status !== "draft" && proposal.status !== "failed") {
						throw new Error("Cannot edit changes after PR submission");
					}

					let repoPath: string;
					if (data.changeKind === "create") {
						repoPath = buildRepoPathFromForm(
							data.specLevel,
							data.values.parent_slug ?? "platform-spec",
							data.values.leaf_slug ?? "new-doc",
						);
					} else {
						const existingChange = data.changeId
							? getSpecProposalChange(db, data.changeId)
							: null;
						if (!existingChange) throw new Error("Change not found");
						repoPath = existingChange.repoPath;
					}

					const pathError = validateSpecLevelPath(data.specLevel, repoPath);
					if (pathError) throw new Error(pathError);

					const frontmatter = formValuesToFrontmatter(
						data.specLevel,
						data.values,
					);
					const fmCheck = validateFrontmatterForLevel(
						data.specLevel,
						frontmatter,
					);
					if (!fmCheck.ok) {
						throw new Error(fmCheck.errors.join("; "));
					}

					const slug = buildSlugFromRepoPath(repoPath);
					const pathClass = pathClassFromRepoPath(repoPath);
					const bodyMd = data.values.body_md ?? "";
					let layoutJson: string | null = data.values.layout_json?.trim()
						? data.values.layout_json
						: null;
					if (!layoutJson && data.values.layout_preset?.trim()) {
						layoutJson = JSON.stringify({
							version: 1,
							level: data.specLevel,
							extends: data.values.layout_preset.trim(),
						});
					}

					const payload = {
						proposalId: data.proposalId,
						changeKind: data.changeKind,
						repoPath,
						slug,
						pathClass,
						specLevel: data.specLevel,
						frontmatterJson: JSON.stringify(frontmatter),
						bodyMd,
						layoutJson,
						sortOrder: proposal.changes.length,
					};

					if (data.changeId) {
						updateSpecProposalChange(db, data.changeId, payload);
						return getSpecProposalChange(db, data.changeId);
					}

					const id = crypto.randomUUID();
					return insertSpecProposalChange(db, { id, ...payload });
				},
			),
		),
	);

export const deleteSpecProposalChangeFn = createServerFn({ method: "POST" })
	.inputValidator((data: { changeId: string }) => data)
	.handler(async ({ data }) =>
		withAuthUser(async () =>
			withIssuesDb((db, { deleteSpecProposalChange }) => {
				deleteSpecProposalChange(db, data.changeId);
				return { ok: true };
			}),
		),
	);

export const validateSpecProposalFn = createServerFn({ method: "POST" })
	.inputValidator((data: { id: string }) => data)
	.handler(
		async ({ data }): Promise<ProposalValidationResult> =>
			withAuthUser(async () =>
				withIssuesDb((db, { getSpecProposal, updateSpecProposal }) => {
					const proposal = getSpecProposal(db, data.id);
					if (!proposal) throw new Error("Proposal not found");

					updateSpecProposal(db, data.id, { status: "validating" });

					if (proposal.changes.length === 0) {
						const result: ProposalValidationResult = {
							ok: false,
							issues: [
								{
									code: "PROP001",
									severity: "error",
									file: "",
									message: "Proposal has no document changes",
									source: "proposal",
								},
							],
							validatedAt: new Date().toISOString(),
						};
						updateSpecProposal(db, data.id, {
							status: "failed",
							validationJson: JSON.stringify(result),
						});
						return result;
					}

					return (async () => {
						const workspace = await materializeProposalWorkspace(
							proposal.changes,
						);
						try {
							const verify = verifyProposalWorkspace({
								websiteRoot: workspace.websiteRoot,
								changedRelPaths: workspace.changedRelPaths,
							});

							const result: ProposalValidationResult = {
								ok: verify.ok,
								issues: verify.issues,
								validatedAt: new Date().toISOString(),
							};

							updateSpecProposal(db, data.id, {
								status: result.ok ? "draft" : "failed",
								validationJson: JSON.stringify(result),
							});

							return result;
						} finally {
							cleanupMaterializedWorkspace(workspace);
						}
					})();
				}),
			),
	);

export const submitSpecProposalFn = createServerFn({ method: "POST" })
	.inputValidator((data: { id: string }) => data)
	.handler(async ({ data }) =>
		withAuthUser(async ({ octokit }) =>
			withIssuesDb((db, { getSpecProposal, updateSpecProposal }) => {
				const proposal = getSpecProposal(db, data.id);
				if (!proposal) throw new Error("Proposal not found");

				const validation = proposal.validationJson
					? (JSON.parse(proposal.validationJson) as ProposalValidationResult)
					: null;
				if (!validation?.ok) {
					throw new Error("Validate the proposal before submitting");
				}

				updateSpecProposal(db, data.id, { status: "submitting" });

				return (async () => {
					try {
						const pr = await submitSpecProposalPullRequest(
							octokit,
							proposal,
							proposal.changes,
						);
						updateSpecProposal(db, data.id, {
							status: "pr_open",
							headBranch: pr.branch,
							prNumber: pr.prNumber,
							prUrl: pr.prUrl,
						});
						return getSpecProposal(db, data.id);
					} catch (error) {
						const message =
							error instanceof Error ? error.message : String(error);
						updateSpecProposal(db, data.id, {
							status: "failed",
							validationJson: JSON.stringify({
								ok: false,
								issues: [
									{
										code: "PROP002",
										severity: "error",
										file: "",
										message,
										source: "github",
									},
								],
								validatedAt: new Date().toISOString(),
							}),
						});
						throw error;
					}
				})();
			}),
		),
	);

export const refreshSpecProposalPrFn = createServerFn({ method: "POST" })
	.inputValidator((data: { id: string }) => data)
	.handler(async ({ data }) =>
		withAuthUser(async ({ octokit }) =>
			withIssuesDb((db, { getSpecProposal, updateSpecProposal }) => {
				const proposal = getSpecProposal(db, data.id);
				if (!proposal?.prNumber) return proposal;

				return (async () => {
					const status = await refreshProposalPrStatus(octokit, proposal);
					updateSpecProposal(db, data.id, { status });
					return getSpecProposal(db, data.id);
				})();
			}),
		),
	);

export { frontmatterToFormValues };
