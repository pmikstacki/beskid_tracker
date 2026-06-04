import { scopeLabelsFromRelation } from "#/lib/github/mappers";
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
import type { RoadmapTask } from "#/lib/github/types";

/** Rebuilds roadmap GitHub labels from a task snapshot (preserves priority, scope, approval). */
export function buildRoadmapIssueLabels(
	task: RoadmapTask,
	overrides: { statusColumn?: RoadmapColumnId } = {},
): string[] {
	const statusColumn = overrides.statusColumn ?? task.statusColumn;
	let nextLabels = stripRoadmapScopedLabels(task.labelNames);
	nextLabels = nextLabels.filter((n) => !isRoadmapStatusLabel(n));
	nextLabels.push(statusLabelForColumn(statusColumn));
	nextLabels.push(priorityLabel(task.priority));
	if (task.workstream) {
		nextLabels.push(workstreamLabel(task.workstream));
	}
	const approval =
		task.specApproval === "approved"
			? ROADMAP_SPEC_APPROVAL.approved
			: ROADMAP_SPEC_APPROVAL.pending;
	nextLabels.push(approval);
	for (const relation of task.specRelations) {
		for (const label of scopeLabelsFromRelation(relation)) {
			if (!nextLabels.includes(label)) nextLabels.push(label);
		}
	}
	for (const name of task.labelNames) {
		if (isRoadmapVersionLabel(name) && !nextLabels.includes(name)) {
			nextLabels.push(name);
		}
	}
	return nextLabels;
}
