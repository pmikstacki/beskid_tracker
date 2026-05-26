import type { Database } from "bun:sqlite";

import type {
	SpecProposal,
	SpecProposalChange,
	SpecProposalChangeKind,
	SpecProposalStatus,
	SpecProposalWithChanges,
} from "#/lib/docs-spec/types";

interface ProposalRow {
	id: string;
	title: string;
	summary: string;
	status: string;
	author_login: string;
	base_ref: string;
	head_branch: string | null;
	pr_number: number | null;
	pr_url: string | null;
	validation_json: string | null;
	created_at: string;
	updated_at: string;
}

interface ChangeRow {
	id: string;
	proposal_id: string;
	change_kind: string;
	repo_path: string;
	slug: string;
	path_class: string;
	spec_level: string;
	frontmatter_json: string;
	body_md: string;
	layout_json: string | null;
	sort_order: number;
	created_at: string;
	updated_at: string;
}

function mapProposal(row: ProposalRow): SpecProposal {
	return {
		id: row.id,
		title: row.title,
		summary: row.summary,
		status: row.status as SpecProposalStatus,
		authorLogin: row.author_login,
		baseRef: row.base_ref,
		headBranch: row.head_branch,
		prNumber: row.pr_number,
		prUrl: row.pr_url,
		validationJson: row.validation_json,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function mapChange(row: ChangeRow): SpecProposalChange {
	return {
		id: row.id,
		proposalId: row.proposal_id,
		changeKind: row.change_kind as SpecProposalChangeKind,
		repoPath: row.repo_path,
		slug: row.slug,
		pathClass: row.path_class,
		specLevel: row.spec_level,
		frontmatterJson: row.frontmatter_json,
		bodyMd: row.body_md,
		layoutJson: row.layout_json,
		sortOrder: row.sort_order,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

export function listSpecProposals(db: Database): SpecProposal[] {
	const rows = db
		.query<ProposalRow, []>(
			`SELECT * FROM spec_proposals ORDER BY updated_at DESC`,
		)
		.all();
	return rows.map(mapProposal);
}

export function getSpecProposal(
	db: Database,
	id: string,
): SpecProposalWithChanges | null {
	const row = db
		.query<ProposalRow, [string]>(`SELECT * FROM spec_proposals WHERE id = ?`)
		.get(id);
	if (!row) return null;

	const changes = db
		.query<ChangeRow, [string]>(
			`SELECT * FROM spec_proposal_changes WHERE proposal_id = ? ORDER BY sort_order, created_at`,
		)
		.all(id)
		.map(mapChange);

	return { ...mapProposal(row), changes };
}

export function insertSpecProposal(
	db: Database,
	proposal: Omit<SpecProposal, "createdAt" | "updatedAt">,
): SpecProposal {
	const now = new Date().toISOString();
	db.run(
		`INSERT INTO spec_proposals (
			id, title, summary, status, author_login, base_ref, head_branch,
			pr_number, pr_url, validation_json, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			proposal.id,
			proposal.title,
			proposal.summary,
			proposal.status,
			proposal.authorLogin,
			proposal.baseRef,
			proposal.headBranch,
			proposal.prNumber,
			proposal.prUrl,
			proposal.validationJson,
			now,
			now,
		],
	);
	return { ...proposal, createdAt: now, updatedAt: now };
}

export function updateSpecProposal(
	db: Database,
	id: string,
	patch: Partial<
		Pick<
			SpecProposal,
			| "title"
			| "summary"
			| "status"
			| "headBranch"
			| "prNumber"
			| "prUrl"
			| "validationJson"
		>
	>,
): void {
	const now = new Date().toISOString();
	const fields: string[] = ["updated_at = ?"];
	const values: unknown[] = [now];

	if (patch.title !== undefined) {
		fields.push("title = ?");
		values.push(patch.title);
	}
	if (patch.summary !== undefined) {
		fields.push("summary = ?");
		values.push(patch.summary);
	}
	if (patch.status !== undefined) {
		fields.push("status = ?");
		values.push(patch.status);
	}
	if (patch.headBranch !== undefined) {
		fields.push("head_branch = ?");
		values.push(patch.headBranch);
	}
	if (patch.prNumber !== undefined) {
		fields.push("pr_number = ?");
		values.push(patch.prNumber);
	}
	if (patch.prUrl !== undefined) {
		fields.push("pr_url = ?");
		values.push(patch.prUrl);
	}
	if (patch.validationJson !== undefined) {
		fields.push("validation_json = ?");
		values.push(patch.validationJson);
	}

	values.push(id);
	db.run(`UPDATE spec_proposals SET ${fields.join(", ")} WHERE id = ?`, values);
}

export function deleteSpecProposal(db: Database, id: string): void {
	db.run(`DELETE FROM spec_proposals WHERE id = ?`, [id]);
}

export function insertSpecProposalChange(
	db: Database,
	change: Omit<SpecProposalChange, "createdAt" | "updatedAt">,
): SpecProposalChange {
	const now = new Date().toISOString();
	db.run(
		`INSERT INTO spec_proposal_changes (
			id, proposal_id, change_kind, repo_path, slug, path_class, spec_level,
			frontmatter_json, body_md, layout_json, sort_order, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			change.id,
			change.proposalId,
			change.changeKind,
			change.repoPath,
			change.slug,
			change.pathClass,
			change.specLevel,
			change.frontmatterJson,
			change.bodyMd,
			change.layoutJson,
			change.sortOrder,
			now,
			now,
		],
	);
	return { ...change, createdAt: now, updatedAt: now };
}

export function updateSpecProposalChange(
	db: Database,
	id: string,
	patch: Partial<
		Pick<
			SpecProposalChange,
			| "changeKind"
			| "repoPath"
			| "slug"
			| "pathClass"
			| "specLevel"
			| "frontmatterJson"
			| "bodyMd"
			| "layoutJson"
			| "sortOrder"
		>
	>,
): void {
	const now = new Date().toISOString();
	const fields: string[] = ["updated_at = ?"];
	const values: unknown[] = [now];

	for (const [key, col] of [
		["changeKind", "change_kind"],
		["repoPath", "repo_path"],
		["slug", "slug"],
		["pathClass", "path_class"],
		["specLevel", "spec_level"],
		["frontmatterJson", "frontmatter_json"],
		["bodyMd", "body_md"],
		["layoutJson", "layout_json"],
		["sortOrder", "sort_order"],
	] as const) {
		const val = patch[key];
		if (val !== undefined) {
			fields.push(`${col} = ?`);
			values.push(val);
		}
	}

	values.push(id);
	db.run(`UPDATE spec_proposal_changes SET ${fields.join(", ")} WHERE id = ?`, values);
}

export function deleteSpecProposalChange(db: Database, id: string): void {
	db.run(`DELETE FROM spec_proposal_changes WHERE id = ?`, [id]);
}

export function getSpecProposalChange(
	db: Database,
	id: string,
): SpecProposalChange | null {
	const row = db
		.query<ChangeRow, [string]>(`SELECT * FROM spec_proposal_changes WHERE id = ?`)
		.get(id);
	return row ? mapChange(row) : null;
}
