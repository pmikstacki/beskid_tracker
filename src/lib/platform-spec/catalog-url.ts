import { beskidDocsUrl } from "#/lib/beskid-docs-origin";
import {
	decodeCatalogDocSlug,
	encodeCatalogDocSlug,
} from "trudoc/platform-spec/catalog";

export { encodeCatalogDocSlug, decodeCatalogDocSlug };

export const PLATFORM_SPEC_CATALOG_PATH = "/generated/platform-spec-catalog.json";
export const PLATFORM_SPEC_DOCS_PREFIX = "/generated/platform-spec-docs/";

export function platformSpecCatalogUrl(): string {
	return beskidDocsUrl(PLATFORM_SPEC_CATALOG_PATH);
}

export function platformSpecDocBundleUrl(slug: string): string {
	return beskidDocsUrl(`${PLATFORM_SPEC_DOCS_PREFIX}${encodeCatalogDocSlug(slug)}.json`);
}
