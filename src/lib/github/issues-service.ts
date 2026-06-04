import "@tanstack/react-start/server-only";

import type { Octokit } from "@octokit/rest";
import { BUG_LABEL, issueToPublicBug } from "#/lib/github/bug-mappers";
import {
	issueToRoadmapTask,
	scopeLabelsFromRelation,
} from "#/lib/github/mappers";
import {
	ensureVersionMilestone,
	listVersionMilestones,
} from "#/lib/github/milestones-service";
import { repoParams } from "#/lib/github/octokit";
import {
	isRoadmapStatusLabel,
	isRoadmapVersionLabel,
	priorityLabel,
	ROADMAP_SPEC_APPROVAL,
	type RoadmapColumnId,
	statusLabelForColumn,
	stripRoadmapScopedLabels,
	workstreamLabel,
} from "#/lib/github/roadmap-labels";
import type { PublicBug, RoadmapTask } from "#/lib/github/types";
import {
	type SpecRelation,
	upsertSpecRelationsInBody,
} from "#/lib/platform-spec/relations";
import {
	type SubtaskRow,
	stripSubtasksFromBody,
	upsertSubtasksInBody,
} from "#/lib/roadmap/subtasks";
import { persistGithubIssue } from "#/lib/storage/issues-repository";
import type { GitHubIssuePayload } from "#/lib/storage/stored-issue";

export { BUG_LABEL };

async function fetchGithubIssue(
	octokit: Octokit,
	issueNumber: number,
): Promise<GitHubIssuePayload> {
	const { data } = await octokit.rest.issues.get({
		...repoParams(),
		issue_number: issueNumber,
	});
	return data;
}

export async function getRoadmapIssue(
	octokit: Octokit,
	issueNumber: number,
): Promise<RoadmapTask | null> {
	const { getRoadmapIssueFromStore } = await import(
		"#/lib/issues/read-service"
	);
	const cached = getRoadmapIssueFromStore(issueNumber);
	if (cached) return cached;

	const data = await fetchGithubIssue(octokit, issueNumber);
	persistGithubIssue(data);
	return issueToRoadmapTask(data);
}

export async function listVersionLabels(octokit: Octokit): Promise<string[]> {
	return listVersionMilestones(octokit);
}

/** Ensures a GitHub Milestone exists for the delivery version (replaces legacy version labels). */
export async function registerVersionLabel(
	octokit: Octokit,
	version: string,
): Promise<void> {
	await ensureVersionMilestone(octokit, version);
}

function buildLabelsForCreate(input: CreateIssueInput): string[] {
	const labels = [
		statusLabelForColumn(input.statusColumn),
		priorityLabel(input.priority),
		ROADMAP_SPEC_APPROVAL.pending,
	];

	if (input.workstream) {
		labels.push(workstreamLabel(input.workstream));
	}

	const scope = new Set<string>();
	for (const relation of input.specRelations) {
		for (const label of scopeLabelsFromRelation(relation)) {
			scope.add(label);
		}
	}
	labels.push(...scope);

	return labels;
}

export async function moveIssueToColumn(
	octokit: Octokit,
	issueNumber: number,
	targetColumn: RoadmapColumnId,
): Promise<RoadmapTask> {
	const { data: issue } = await octokit.rest.issues.get({
		...repoParams(),
		issue_number: issueNumber,
	});

	const currentLabels = (issue.labels ?? [])
		.map((label) => (typeof label === "string" ? label : label.name))
		.filter((name): name is string => Boolean(name));

	const nextLabels = [
		...stripRoadmapScopedLabels(currentLabels),
		...currentLabels.filter(
			(n) =>
				isRoadmapVersionLabel(n) ||
				n.startsWith("roadmap/workstream/") ||
				n.startsWith("roadmap/domain/") ||
				n.startsWith("roadmap/area/") ||
				n.startsWith("roadmap/feature/") ||
				n.startsWith("roadmap/spec-approval/"),
		),
		statusLabelForColumn(targetColumn),
	];

	await octokit.rest.issues.setLabels({
		...repoParams(),
		issue_number: issueNumber,
		labels: nextLabels,
	});

	await octokit.rest.issues.update({
		...repoParams(),
		issue_number: issueNumber,
		state: targetColumn === "Done" ? "closed" : "open",
	});

	const data = await fetchGithubIssue(octokit, issueNumber);
	persistGithubIssue(data);
	const updated = issueToRoadmapTask(data);
	if (!updated) {
		throw new Error(`Issue #${issueNumber} not found after label update`);
	}
	return updated;
}

export interface CreateIssueInput {
	title: string;
	body: string;
	priority: "high" | "medium" | "low";
	statusColumn: RoadmapColumnId;
	version: string;
	workstream?: string;
	specRelations: SpecRelation[];
}

export interface IssueAttachmentInput {
	name: string;
	contentBase64: string;
}

export interface CreatePublicBugInput {
	title: string;
	body: string;
	attachments?: IssueAttachmentInput[];
}

export async function createPublicBugIssue(
	octokit: Octokit,
	input: CreatePublicBugInput,
): Promise<PublicBug> {
	const { data } = await octokit.rest.issues.create({
		...repoParams(),
		title: input.title.trim(),
		body: input.body.trim() || undefined,
		labels: [BUG_LABEL],
	});

	if (input.attachments?.length) {
		const { uploadIssueAttachments } = await import(
			"#/lib/github/issue-attachments"
		);
		try {
			await uploadIssueAttachments(octokit, data.number, input.attachments);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Attachment upload failed";
			await octokit.rest.issues.createComment({
				...repoParams(),
				issue_number: data.number,
				body: `> Attachment upload failed: ${message}\n\nFiles were listed in the issue body but could not be pushed to the repository.`,
			});
		}
	}

	persistGithubIssue(data);
	const bug = issueToPublicBug(data);
	if (!bug) {
		throw new Error("Created issue could not be mapped to public bug");
	}
	return bug;
}

export async function createRoadmapIssue(
	octokit: Octokit,
	input: CreateIssueInput,
): Promise<RoadmapTask> {
	const body = upsertSpecRelationsInBody(
		input.body.trim(),
		input.specRelations,
	);
	const milestone = await ensureVersionMilestone(octokit, input.version);

	const { data } = await octokit.rest.issues.create({
		...repoParams(),
		title: input.title,
		body: body || undefined,
		labels: buildLabelsForCreate(input),
		milestone: milestone.number,
		state: input.statusColumn === "Done" ? "closed" : "open",
	});

	persistGithubIssue(data);
	const task = issueToRoadmapTask(data);
	if (!task) {
		throw new Error("Created issue could not be mapped to roadmap task");
	}
	return task;
}

export interface UpdateIssueInput {
	issueNumber: number;
	title?: string;
	body?: string;
	priority?: "high" | "medium" | "low";
	specRelations?: SpecRelation[];
	subtasks?: SubtaskRow[];
	workstream?: string;
}

export async function updateRoadmapIssue(
	octokit: Octokit,
	input: UpdateIssueInput,
): Promise<RoadmapTask> {
	const existing = await getRoadmapIssue(octokit, input.issueNumber);
	if (!existing) {
		throw new Error(`Issue #${input.issueNumber} not found`);
	}

	let body = stripSubtasksFromBody(input.body ?? existing.body);
	if (input.specRelations) {
		body = upsertSpecRelationsInBody(body, input.specRelations);
	}
	const subtasks = input.subtasks ?? existing.subtasks;
	body = upsertSubtasksInBody(body, subtasks);

	if (
		input.title !== undefined ||
		input.body !== undefined ||
		input.specRelations !== undefined ||
		input.subtasks !== undefined
	) {
		await octokit.rest.issues.update({
			...repoParams(),
			issue_number: input.issueNumber,
			title: input.title,
			body,
		});
	}

	let nextLabels = stripRoadmapScopedLabels(existing.labelNames);
	nextLabels = nextLabels.filter((n) => !isRoadmapStatusLabel(n));
	nextLabels.push(statusLabelForColumn(existing.statusColumn));
	if (input.priority) {
		nextLabels.push(priorityLabel(input.priority));
	} else {
		nextLabels.push(priorityLabel(existing.priority));
	}
	if (input.workstream ?? existing.workstream) {
		nextLabels.push(workstreamLabel(input.workstream ?? existing.workstream!));
	}
	const approval =
		existing.specApproval === "approved"
			? ROADMAP_SPEC_APPROVAL.approved
			: ROADMAP_SPEC_APPROVAL.pending;
	nextLabels.push(approval);

	const relations = input.specRelations ?? existing.specRelations;
	for (const relation of relations) {
		for (const label of scopeLabelsFromRelation(relation)) {
			if (!nextLabels.includes(label)) nextLabels.push(label);
		}
	}

	await octokit.rest.issues.setLabels({
		...repoParams(),
		issue_number: input.issueNumber,
		labels: nextLabels,
	});

	const milestone = await ensureVersionMilestone(octokit, existing.version);
	await octokit.rest.issues.update({
		...repoParams(),
		issue_number: input.issueNumber,
		milestone: milestone.number,
	});

	const data = await fetchGithubIssue(octokit, input.issueNumber);
	persistGithubIssue(data);
	const updated = issueToRoadmapTask(data);
	if (!updated) {
		throw new Error(`Issue #${input.issueNumber} not found after update`);
	}
	return updated;
}

export async function approveSpecForIssue(
	octokit: Octokit,
	issueNumber: number,
): Promise<RoadmapTask> {
	const existing = await getRoadmapIssue(octokit, issueNumber);
	if (!existing) {
		throw new Error(`Issue #${issueNumber} not found`);
	}

	const nextLabels = existing.labelNames
		.filter((n) => !n.startsWith("roadmap/spec-approval/"))
		.concat(ROADMAP_SPEC_APPROVAL.approved);

	await octokit.rest.issues.setLabels({
		...repoParams(),
		issue_number: issueNumber,
		labels: nextLabels,
	});

	const data = await fetchGithubIssue(octokit, issueNumber);
	persistGithubIssue(data);
	const updated = issueToRoadmapTask(data);
	if (!updated) {
		throw new Error(`Issue #${issueNumber} not found after approval`);
	}
	return updated;
}
