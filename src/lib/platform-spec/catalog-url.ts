import {
	decodeCatalogDocSlug,
	encodeCatalogDocSlug,
} from "@cyber-nomad-collective/trudoc/platform-spec/catalog";
import { beskidDocsUrl } from "#/lib/beskid-docs-origin";

export { encodeCatalogDocSlug, decodeCatalogDocSlug };

export const PLATFORM_SPEC_CATALOG_PATH = "/api/v1/catalog";
export const PLATFORM_SPEC_DOCS_PREFIX = "/api/v1/docs/";

export function platformSpecCatalogUrl(): string {
	return beskidDocsUrl(PLATFORM_SPEC_CATALOG_PATH);
}

export function platformSpecDocBundleUrl(slug: string): string {
	return beskidDocsUrl(
		`${PLATFORM_SPEC_DOCS_PREFIX}${encodeURIComponent(slug)}`,
	);
}
