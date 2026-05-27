import type { SpecLevel, SpecProposalChangeKind } from "#/lib/docs-spec/types";
import type { ReportFormLayout } from "#/lib/report-issue/fields";
import {
	reportField,
	reportGroup,
	reportSection,
} from "#/lib/report-issue/fields";

function ownershipFields(): ReportFormLayout {
	return [
		reportSection("ownership", "Ownership", [
			reportGroup("owner", "horizontal", [
				reportField({
					id: "owner_name",
					kind: "text",
					label: "Owner name",
					required: true,
				}),
				reportField({
					id: "owner_email",
					kind: "text",
					label: "Owner email",
					required: true,
					placeholder: "name@example.com",
				}),
			]),
			reportGroup("submitter", "horizontal", [
				reportField({
					id: "submitter_name",
					kind: "text",
					label: "Submitter name",
					required: true,
				}),
				reportField({
					id: "submitter_email",
					kind: "text",
					label: "Submitter email",
					required: true,
					placeholder: "name@example.com",
				}),
			]),
		]),
	];
}

function identityFields(): ReportFormLayout {
	return [
		reportSection("identity", "Document", [
			reportField({
				id: "title",
				kind: "text",
				label: "Title",
				required: true,
			}),
			reportField({
				id: "description",
				kind: "textarea",
				label: "Description",
				required: true,
				rows: 2,
			}),
		]),
	];
}

function statusField(): ReportFormLayout {
	return [
		reportField({
			id: "status",
			kind: "select",
			label: "Status",
			required: true,
			options: [
				{ value: "Proposed", label: "Proposed" },
				{ value: "Standard", label: "Standard" },
			],
		}),
	];
}

function adrFields(): ReportFormLayout {
	return [
		reportSection("adr", "ADR metadata", [
			reportGroup("adr-meta", "horizontal", [
				reportField({
					id: "adrId",
					kind: "text",
					label: "ADR id",
					required: true,
					placeholder: "ADR-0001",
				}),
				reportField({
					id: "adrStatus",
					kind: "select",
					label: "ADR status",
					required: true,
					options: [
						{ value: "Proposed", label: "Proposed" },
						{ value: "Accepted", label: "Accepted" },
						{ value: "Superseded", label: "Superseded" },
					],
				}),
			]),
			reportField({
				id: "adrDate",
				kind: "text",
				label: "ADR date",
				placeholder: "2026-05-26",
			}),
		]),
	];
}

function pathFields(changeKind: SpecProposalChangeKind): ReportFormLayout {
	if (changeKind !== "create") return [];
	return [
		reportSection("path", "Path", [
			reportField({
				id: "parent_slug",
				kind: "spec-parent",
				label: "Parent document",
				required: true,
				hint: "Platform-spec parent slug (domain, area, or feature).",
			}),
			reportField({
				id: "leaf_slug",
				kind: "text",
				label: "Document slug segment",
				required: true,
				placeholder: "my-feature or adr/my-adr",
			}),
			reportField({
				id: "layout_preset",
				kind: "layout-preset",
				label: "Layout preset",
				hint: "Required for new domain, area, or feature hubs.",
			}),
		]),
	];
}

export function resolveSpecFormLayout(
	specLevel: SpecLevel,
	changeKind: SpecProposalChangeKind,
): ReportFormLayout {
	const layout: ReportFormLayout = [
		...pathFields(changeKind),
		...identityFields(),
		...ownershipFields(),
	];

	if (
		specLevel === "feature" ||
		specLevel === "article" ||
		specLevel === "adr"
	) {
		layout.push(
			reportSection("normative", "Normative status", [...statusField()]),
		);
	}

	if (specLevel === "adr") {
		layout.push(...adrFields());
	}

	layout.push(
		reportSection("body", "Content", [
			reportField({
				id: "body_md",
				kind: "markdown",
				label: "Markdown body",
				required: true,
				rows: 16,
				hint:
					specLevel === "adr"
						? "Include ## Context, ## Decision, and ## Consequences sections."
						: undefined,
			}),
		]),
		reportSection("relations", "Related topics", [
			reportField({
				id: "related_topics",
				kind: "related-topics",
				label: "Related topics",
			}),
		]),
	);

	return layout;
}

export function formValuesToFrontmatter(
	specLevel: SpecLevel,
	values: Record<string, string>,
): Record<string, unknown> {
	const fm: Record<string, unknown> = {
		title: values.title?.trim(),
		description: values.description?.trim(),
		specLevel,
		owner: {
			name: values.owner_name?.trim(),
			email: values.owner_email?.trim(),
		},
		submitter: {
			name: values.submitter_name?.trim(),
			email: values.submitter_email?.trim(),
		},
	};

	if (
		specLevel === "feature" ||
		specLevel === "article" ||
		specLevel === "adr"
	) {
		fm.status = values.status?.trim() || "Proposed";
	}

	if (specLevel === "adr") {
		fm.adrId = values.adrId?.trim();
		fm.adrStatus = values.adrStatus?.trim() || "Proposed";
		if (values.adrDate?.trim()) fm.adrDate = values.adrDate.trim();
	}

	if (values.related_topics?.trim()) {
		try {
			const topics = JSON.parse(values.related_topics) as unknown;
			if (Array.isArray(topics)) fm.relatedTopics = topics;
		} catch {
			// ignore invalid JSON
		}
	}

	return fm;
}

export function frontmatterToFormValues(
	frontmatter: Record<string, unknown>,
	bodyMd: string,
): Record<string, string> {
	const owner = frontmatter.owner as
		| { name?: string; email?: string }
		| undefined;
	const submitter = frontmatter.submitter as
		| { name?: string; email?: string }
		| undefined;

	return {
		title: String(frontmatter.title ?? ""),
		description: String(frontmatter.description ?? ""),
		status: String(frontmatter.status ?? "Proposed"),
		adrId: String(frontmatter.adrId ?? ""),
		adrStatus: String(frontmatter.adrStatus ?? "Proposed"),
		adrDate: String(frontmatter.adrDate ?? ""),
		owner_name: String(owner?.name ?? ""),
		owner_email: String(owner?.email ?? ""),
		submitter_name: String(submitter?.name ?? ""),
		submitter_email: String(submitter?.email ?? ""),
		related_topics: frontmatter.relatedTopics
			? JSON.stringify(frontmatter.relatedTopics, null, 2)
			: "[]",
		body_md: bodyMd,
	};
}
