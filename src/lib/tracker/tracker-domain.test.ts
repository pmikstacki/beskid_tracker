import { describe, expect, it } from "vitest";

import {
	compareSemverVersion,
	parseSemverVersion,
	resolveActiveVersionId,
} from "#/lib/tracker/active-version";
import {
	isBugInGithubSyncScope,
	isTaskInGithubSyncScope,
} from "#/lib/tracker/sync-scope";
import type { TrackerTask } from "#/lib/tracker/types";

describe("active-version", () => {
	it("parses semver version ids", () => {
		expect(parseSemverVersion("v0.4")).toEqual({ major: 0, minor: 4 });
		expect(parseSemverVersion("invalid")).toBeNull();
	});

	it("compares semver versions", () => {
		expect(compareSemverVersion("v0.4", "v0.3")).toBeGreaterThan(0);
		expect(compareSemverVersion("v0.2", "v0.10")).toBeLessThan(0);
	});

	it("prefers in-progress versions by highest semver", () => {
		const active = resolveActiveVersionId([
			{ id: "v0.3", status: "Released" },
			{ id: "v0.4", status: "In Progress" },
			{ id: "v0.2", status: "In Progress" },
		]);
		expect(active).toBe("v0.4");
	});

	it("falls back to highest semver when none in progress", () => {
		const active = resolveActiveVersionId([
			{ id: "v0.2", status: "Released" },
			{ id: "v0.4", status: "Released" },
			{ id: "v0.3", status: "Released" },
		]);
		expect(active).toBe("v0.4");
	});
});

describe("sync-scope", () => {
	const task = (versionId: string): TrackerTask => ({
		versionId,
		id: "sample",
		title: "Sample",
		statusColumn: "Backlog",
		priority: "medium",
		body: "",
		specRelations: [],
		subtasks: [],
		source: { repo: "beskid", commit: "abc", subject: "x" },
		localUpdatedAt: "2026-01-01T00:00:00.000Z",
	});

	it("includes active version tasks only", () => {
		expect(isTaskInGithubSyncScope(task("v0.4"), "v0.4")).toBe(true);
		expect(isTaskInGithubSyncScope(task("v0.3"), "v0.4")).toBe(false);
	});

	it("includes all bugs", () => {
		expect(isBugInGithubSyncScope({ id: "bug-1" })).toBe(true);
	});
});
