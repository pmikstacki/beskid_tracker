import { describe, expect, it } from "vitest";

import {
	BESKID_DOCS_ORIGIN,
	BESKID_STANDARD_URL,
	beskidDocsUrl,
} from "#/lib/beskid-docs-origin";
import { openSpecCatalogUrl } from "#/lib/platform-spec/catalog-url";

describe("Beskid documentation URLs", () => {
	it("uses the main site as the only public documentation origin", () => {
		expect(BESKID_DOCS_ORIGIN).toBe("https://beskid-lang.org");
		expect(BESKID_STANDARD_URL).toBe("https://beskid-lang.org/docs/standard/");
		expect(beskidDocsUrl("/openspec/catalog.json")).toBe(
			"https://beskid-lang.org/openspec/catalog.json",
		);
		expect(openSpecCatalogUrl()).toBe(
			"https://raw.githubusercontent.com/Cyber-Nomad-Collective/beskid/main/openspec/catalog.json",
		);
	});
});
