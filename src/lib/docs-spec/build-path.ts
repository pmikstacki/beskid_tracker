import type { SpecLevel } from "#/lib/docs-spec/types";
import { repoPathFromSpecRel } from "#/lib/docs-spec/path-rules";

export function buildRepoPathFromForm(
	specLevel: SpecLevel,
	parentSlug: string,
	leafSlug: string,
): string {
	const parent = parentSlug.replace(/\/$/, "");
	const leaf = leafSlug.replace(/^\/+/, "").replace(/\/+$/, "");

	let rel: string;
	if (specLevel === "domain") {
		rel = `${parent}/${leaf}/index`;
	} else if (specLevel === "area") {
		rel = `${parent}/${leaf}/index`;
	} else if (specLevel === "feature") {
		rel = `${parent}/${leaf}/index`;
	} else if (specLevel === "adr") {
		rel = `${parent}/${leaf}`;
	} else {
		rel = `${parent}/${leaf}`;
	}

	const relUnderSpec = rel.replace(/^platform-spec\//, "");
	return repoPathFromSpecRel(relUnderSpec);
}

export function buildSlugFromRepoPath(repoPath: string): string {
	const rel = repoPath
		.replace(/^site\/website\/src\/content\/docs\//, "")
		.replace(/\.(md|mdx)$/i, "")
		.replace(/\/index$/, "");
	return rel.startsWith("platform-spec/") ? rel : `platform-spec/${rel}`;
}
