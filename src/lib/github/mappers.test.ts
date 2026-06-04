import { describe, expect, it } from "vitest";

import { issueToRoadmapTask } from "#/lib/github/mappers";
import { ROADMAP_STATUS_LABELS } from "#/lib/github/roadmap-labels";

describe("issueToRoadmapTask", () => {
	it("uses milestone title as version when it matches vX.Y", () => {
		const task = issueToRoadmapTask({
			number: 10,
			title: "Task",
			body: "",
			state: "open",
			html_url: "https://github.com/o/r/issues/10",
			labels: [{ name: ROADMAP_STATUS_LABELS.backlog }],
			milestone: { title: "v0.3", number: 5 },
		} as Parameters<typeof issueToRoadmapTask>[0]);

		expect(task?.version).toBe("v0.3");
	});

	it("falls back to roadmap/version label when milestone is absent", () => {
		const task = issueToRoadmapTask({
			number: 11,
			title: "Task",
			body: "",
			state: "open",
			html_url: "https://github.com/o/r/issues/11",
			labels: [
				{ name: "roadmap/version/v0.1" },
				{ name: ROADMAP_STATUS_LABELS.backlog },
			],
		} as Parameters<typeof issueToRoadmapTask>[0]);

		expect(task?.version).toBe("v0.1");
	});

	it("maps closed issues without status label to Done", () => {
		const task = issueToRoadmapTask({
			number: 12,
			title: "Done task",
			body: "",
			state: "closed",
			html_url: "https://github.com/o/r/issues/12",
			labels: [{ name: "roadmap/version/v0.2" }],
			milestone: { title: "v0.2", number: 2 },
		} as Parameters<typeof issueToRoadmapTask>[0]);

		expect(task?.statusColumn).toBe("Done");
	});
});
