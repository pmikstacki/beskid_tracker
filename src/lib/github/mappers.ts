import type { RestEndpointMethodTypes } from "@octokit/rest";

import {
	areaFromLabel,
	areaLabel,
	columnIdForStatusLabel,
	domainFromLabel,
	domainLabel,
	featureFromLabel,
	featureLabel,
	isRoadmapStatusLabel,
	priorityFromLabels,
	ROADMAP_COLUMNS,
	type RoadmapColumnId,
	specApprovalFromLabels,
	versionFromLabel,
	versionFromMilestoneTitle,
	workstreamFromLabel,
} from "#/lib/github/roadmap-labels";
import type { RoadmapColumns, RoadmapTask } from "#/lib/github/types";
import { parseSpecLinks } from "#/lib/platform-spec/parse";
import {
	hierarchyFromSlug,
	mergeLegacySpecLinks,
	parseSpecRelationsBlock,
	type SpecRelation,
} from "#/lib/platform-spec/relations";
import { parseSubtasksBlock } from "#/lib/roadmap/subtasks";

type GitHubIssue =
	RestEndpointMethodTypes["issues"]["listForRepo"]["response"]["data"][number];

function labelNamesFromIssue(issue: GitHubIssue): string[] {
	return (issue.labels ?? [])
		.map((label) => (typeof label === "string" ? label : label.name))
		.filter((name): name is string => Boolean(name));
}

export function issueToRoadmapTask(issue: GitHubIssue): RoadmapTask | null {
	if (issue.pull_request) return null;

	const labelNames = labelNamesFromIssue(issue);
	const body = issue.body ?? "";

	const statusLabel = labelNames.find(isRoadmapStatusLabel);
	let statusColumn: RoadmapColumnId = statusLabel
		? columnIdForStatusLabel(statusLabel)
		: "Backlog";
	if (!statusLabel && issue.state === "closed") {
		statusColumn = "Done";
	}

	const version =
		versionFromMilestoneTitle(issue.milestone?.title) ??
		labelNames.map(versionFromLabel).find(Boolean) ??
		"v0.2";

	const parsedBlock = parseSpecRelationsBlock(body);
	const legacy = parseSpecLinks(body).map((link) => ({
		path: link.path,
		title: link.title,
	}));
	const specRelations = mergeLegacySpecLinks(parsedBlock.relations, legacy);
	const subtasks = parseSubtasksBlock(body).items;

	const primary = specRelations.find((r) => r.required) ?? specRelations[0];
	const hierarchy = primary
		? hierarchyFromSlug(primary.path.replace(/^\//, ""))
		: null;

	const assignee = issue.assignees?.[0]?.login ?? issue.user?.login ?? "";

	return {
		id: String(issue.number),
		number: issue.number,
		title: issue.title,
		owner: assignee,
		priority: priorityFromLabels(labelNames),
		statusColumn,
		body,
		specRelations,
		subtasks,
		specApproval: specApprovalFromLabels(labelNames),
		version,
		workstream: labelNames.map(workstreamFromLabel).find(Boolean),
		domain: labelNames.map(domainFromLabel).find(Boolean) ?? hierarchy?.domain,
		area: labelNames.map(areaFromLabel).find(Boolean) ?? hierarchy?.area,
		feature:
			labelNames.map(featureFromLabel).find(Boolean) ?? hierarchy?.feature,
		htmlUrl: issue.html_url,
		milestone: issue.milestone
			? { title: issue.milestone.title, number: issue.milestone.number }
			: undefined,
		labelNames,
	};
}

export function issuesToColumns(issues: GitHubIssue[]): RoadmapColumns {
	const columns = Object.fromEntries(
		ROADMAP_COLUMNS.map((column) => [column.id, [] as RoadmapTask[]]),
	) as RoadmapColumns;

	for (const issue of issues) {
		const task = issueToRoadmapTask(issue);
		if (!task) continue;
		columns[task.statusColumn].push(task);
	}

	for (const column of ROADMAP_COLUMNS) {
		columns[column.id].sort((a, b) => a.number - b.number);
	}

	return columns;
}

export function collectBoardMeta(tasks: RoadmapTask[]): {
	workstreams: string[];
	domains: string[];
	areas: string[];
	features: string[];
} {
	const workstreams = new Set<string>();
	const domains = new Set<string>();
	const areas = new Set<string>();
	const features = new Set<string>();

	for (const task of tasks) {
		if (task.workstream) workstreams.add(task.workstream);
		if (task.domain) domains.add(task.domain);
		if (task.area) areas.add(task.area);
		if (task.feature) features.add(task.feature);
	}

	return {
		workstreams: [...workstreams].sort(),
		domains: [...domains].sort(),
		areas: [...areas].sort(),
		features: [...features].sort(),
	};
}

export function scopeLabelsFromRelation(relation: SpecRelation): string[] {
	const h = hierarchyFromSlug(relation.path.replace(/^\//, ""));
	const labels: string[] = [];
	if (h.domain) labels.push(domainLabel(h.domain));
	if (h.area) labels.push(areaLabel(h.area));
	if (h.feature) labels.push(featureLabel(h.feature));
	return labels;
}
