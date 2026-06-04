import { describe, expect, it } from "vitest";

import { buildRoadmapIssueLabels } from "#/lib/github/roadmap-issue-labels";
import {
	ROADMAP_PRIORITY_LABELS,
	ROADMAP_STATUS_LABELS,
} from "#/lib/github/roadmap-labels";
import type { RoadmapTask } from "#/lib/github/types";

function minimalTask(overrides: Partial<RoadmapTask> = {}): RoadmapTask {
	return {
		id: "1",
		number: 1,
		title: "Task",
		owner: "dev",
		priority: "high",
		statusColumn: "Backlog",
		body: "",
		specRelations: [],
		subtasks: [],
		specApproval: "pending",
		version: "v0.2",
		htmlUrl: "https://example.com/issues/1",
		labelNames: [
			ROADMAP_STATUS_LABELS.backlog,
			ROADMAP_PRIORITY_LABELS.high,
			"roadmap/spec-approval/pending",
		],
		...overrides,
	};
}

describe("buildRoadmapIssueLabels", () => {
	it("sets status label for target column and keeps priority", () => {
		const labels = buildRoadmapIssueLabels(minimalTask(), {
			statusColumn: "In Progress",
		});
		expect(labels).toContain(ROADMAP_STATUS_LABELS.inProgress);
		expect(labels).toContain(ROADMAP_PRIORITY_LABELS.high);
		expect(labels).not.toContain(ROADMAP_STATUS_LABELS.backlog);
	});
});
