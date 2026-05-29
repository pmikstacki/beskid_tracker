import { createServerFn } from "@tanstack/react-start";

import type { PlatformSpecCatalogEntry } from "#/lib/platform-spec/catalog";
import * as platformSpecCatalogServer from "#/server/platform-spec-catalog.server";

export const getPlatformSpecCatalog = createServerFn({ method: "GET" }).handler(
	async () => platformSpecCatalogServer.loadPlatformSpecCatalog(),
);

export const getPlatformSpecDocument = createServerFn({ method: "GET" })
	.inputValidator((data: { slug: string }) => data)
	.handler(async ({ data }) =>
		platformSpecCatalogServer.loadPlatformSpecDocument(data.slug),
	);

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
		const catalog = await platformSpecCatalogServer.loadPlatformSpecCatalog();
		let entries = catalog.entries;

		if (data.specLevel || data.pathClass || data.status || data.domain) {
			entries = platformSpecCatalogServer.filterCatalogEntries(entries, {
				specLevel: data.specLevel,
				pathClass: data.pathClass,
				status: data.status,
				domain: data.domain,
			});
		}

		return platformSpecCatalogServer.searchCatalogEntries(
			entries,
			data.query,
			data.limit ?? 20,
		);
	});
