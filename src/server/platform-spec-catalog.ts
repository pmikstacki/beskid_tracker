import { createServerFn } from "@tanstack/react-start";

import {
	filterCatalogEntries,
	type PlatformSpecCatalogEntry,
	searchCatalogEntries,
} from "#/lib/platform-spec/catalog";
import {
	loadPlatformSpecCatalog,
	loadPlatformSpecDocument,
} from "#/lib/platform-spec/catalog-loader";

export const getPlatformSpecCatalog = createServerFn({ method: "GET" }).handler(
	async () => {
		const catalog = await loadPlatformSpecCatalog();
		return catalog;
	},
);

export const getPlatformSpecDocument = createServerFn({ method: "GET" })
	.inputValidator((data: { slug: string }) => data)
	.handler(async ({ data }) => loadPlatformSpecDocument(data.slug));

export const searchPlatformSpecCatalog = createServerFn({ method: "GET" })
	.inputValidator(
		(data: {
			query: string;
			limit?: number;
			specLevel?: string;
			pathClass?: string;
			status?: string;
			domain?: string;
		}) => data,
	)
	.handler(async ({ data }): Promise<PlatformSpecCatalogEntry[]> => {
		const catalog = await loadPlatformSpecCatalog();
		let entries = catalog.entries;

		if (data.specLevel || data.pathClass || data.status || data.domain) {
			entries = filterCatalogEntries(entries, {
				specLevel: data.specLevel,
				pathClass: data.pathClass,
				status: data.status,
				domain: data.domain,
			});
		}

		return searchCatalogEntries(entries, data.query, data.limit ?? 40);
	});
