export type SpecProposalStatus =
	| "draft"
	| "validating"
	| "submitting"
	| "pr_open"
	| "merged"
	| "closed"
	| "failed";

export type SpecProposalChangeKind = "create" | "update" | "delete";

export type SpecLevel = "domain" | "area" | "feature" | "article" | "adr";

export interface SpecProposal {
	id: string;
	title: string;
	summary: string;
	status: SpecProposalStatus;
	authorLogin: string;
	baseRef: string;
	headBranch: string | null;
	prNumber: number | null;
	prUrl: string | null;
	validationJson: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface SpecProposalChange {
	id: string;
	proposalId: string;
	changeKind: SpecProposalChangeKind;
	repoPath: string;
	slug: string;
	pathClass: string;
	specLevel: string;
	frontmatterJson: string;
	bodyMd: string;
	layoutJson: string | null;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
}

export interface SpecProposalWithChanges extends SpecProposal {
	changes: SpecProposalChange[];
}

export interface ProposalValidationResult {
	ok: boolean;
	issues: {
		code: string;
		severity: "error" | "warn";
		file: string;
		message: string;
		source: string;
	}[];
	validatedAt: string;
}
