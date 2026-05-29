import {
	filterCatalogEntries,
	type PlatformSpecCatalogEntry,
	searchCatalogEntries,
} from "#/lib/platform-spec/catalog";
import {
	loadPlatformSpecCatalog,
	loadPlatformSpecDocument,
} from "#/lib/platform-spec/catalog-loader";

export {
	loadPlatformSpecCatalog,
	loadPlatformSpecDocument,
	filterCatalogEntries,
	searchCatalogEntries,
};

export type { PlatformSpecCatalogEntry };
