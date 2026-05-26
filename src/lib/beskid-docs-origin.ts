/** Canonical docs / platform-spec origin (no env override). */
export const BESKID_DOCS_ORIGIN = "https://beskid-lang.org";

export function beskidDocsUrl(path: string): string {
	const base = BESKID_DOCS_ORIGIN.replace(/\/+$/, "");
	const normalized = path.startsWith("/") ? path : `/${path}`;
	return `${base}${normalized}`;
}
