import { describe, expect, it } from "vitest";

import {
	catalogDomains,
	filterCatalogEntries,
	type PlatformSpecCatalogEntry,
	searchCatalogEntries,
} from "#/lib/platform-spec/catalog";

const sample: PlatformSpecCatalogEntry[] = [
	{
		slug: "platform-spec/compiler/mods",
		href: "/platform-spec/compiler/mods/",
		pathClass: "feature",
		specLevel: "feature",
		title: "Mods",
		description: null,
		status: "Standard",
		adrId: null,
		adrStatus: null,
		repoPath: "src/content/docs/platform-spec/compiler/mods/index.mdx",
		contentPath:
			"/generated/platform-spec-docs/platform-spec--compiler--mods.json",
		parentSlug: "platform-spec/compiler",
		hasLayoutJson: true,
	},
	{
		slug: "platform-spec/compiler/mods/adr/example",
		href: "/platform-spec/compiler/mods/adr/example/",
		pathClass: "adr",
		specLevel: "adr",
		title: "Example ADR",
		description: null,
		status: "Proposed",
		adrId: "ADR-0001",
		adrStatus: "Proposed",
		repoPath: "src/content/docs/platform-spec/compiler/mods/adr/example.mdx",
		contentPath:
			"/generated/platform-spec-docs/platform-spec--compiler--mods--adr--example.json",
		parentSlug: "platform-spec/compiler/mods",
		hasLayoutJson: false,
	},
];

describe("catalog search and filters", () => {
	it("finds entries by title", () => {
		const hits = searchCatalogEntries(sample, "mods", 10);
		expect(hits.some((h) => h.slug.includes("mods"))).toBe(true);
	});

	it("filters by spec level including adr", () => {
		const adrs = filterCatalogEntries(sample, { specLevel: "adr" });
		expect(adrs).toHaveLength(1);
		expect(adrs[0]?.specLevel).toBe("adr");
	});

	it("lists domains from slugs", () => {
		expect(catalogDomains(sample)).toEqual(["compiler"]);
	});
});
