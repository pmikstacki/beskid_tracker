/** Canonical origin for the public Beskid documentation and OpenSpec catalog. */
export const BESKID_DOCS_ORIGIN = "https://beskid-lang.org";
export const BESKID_STANDARD_URL = `${BESKID_DOCS_ORIGIN}/docs/standard/`;

export function beskidDocsUrl(path: string): string {
	const base = BESKID_DOCS_ORIGIN.replace(/\/+$/, "");
	const normalized = path.startsWith("/") ? path : `/${path}`;
	return `${base}${normalized}`;
}
