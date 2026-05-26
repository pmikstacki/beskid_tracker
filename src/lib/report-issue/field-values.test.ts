import { describe, expect, it } from "vitest";

import {
	parseStepsValue,
	serializeStepsValue,
	stepsToMarkdown,
} from "#/lib/report-issue/field-values";

describe("steps field values", () => {
	it("round-trips JSON steps", () => {
		const raw = serializeStepsValue(["a", "b"]);
		expect(parseStepsValue(raw)).toEqual(["a", "b"]);
	});

	it("parses legacy numbered plain text", () => {
		expect(parseStepsValue("1. First\n2. Second")).toEqual(["First", "Second"]);
	});

	it("formats markdown list", () => {
		expect(stepsToMarkdown(["Alpha", "Beta"])).toBe("1. Alpha\n2. Beta");
	});
});
