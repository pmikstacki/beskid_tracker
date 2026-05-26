import { classifyPlatformSpecRel } from "trudoc/layout";

export type PathClass =
	| "domain-root"
	| "domain"
	| "area"
	| "feature"
	| "article"
	| "adr"
	| "legacy-or-bridge"
	| "component";

export function pathClassFromRepoPath(repoPath: string): PathClass {
	const marker = "src/content/docs/platform-spec/";
	const idx = repoPath.indexOf(marker);
	if (idx === -1) return "legacy-or-bridge";
	const rel = repoPath.slice(idx + marker.length).replace(/\.(md|mdx)$/i, "");
	return classifyPlatformSpecRel(rel);
}

export function specRelFromRepoPath(repoPath: string): string {
	const marker = "src/content/docs/platform-spec/";
	const idx = repoPath.indexOf(marker);
	if (idx === -1) return repoPath;
	return repoPath.slice(idx + marker.length);
}

export function repoPathFromSpecRel(rel: string, ext: "mdx" | "md" = "mdx"): string {
	const normalized = rel.replace(/\\/g, "/").replace(/^\//, "");
	return `site/website/src/content/docs/platform-spec/${normalized}${normalized.endsWith(`.${ext}`) ? "" : `.${ext}`}`;
}

export function slugFromRepoPath(repoPath: string): string {
	const rel = specRelFromRepoPath(repoPath);
	return `platform-spec/${rel.replace(/\.(md|mdx)$/i, "").replace(/\/index$/, "")}`;
}

export function validateSpecLevelPath(
	specLevel: string,
	repoPath: string,
): string | null {
	const pathClass = pathClassFromRepoPath(repoPath);
	const expected: Record<string, PathClass> = {
		domain: "domain",
		area: "area",
		feature: "feature",
		article: "article",
		adr: "adr",
	};
	const want = expected[specLevel];
	if (!want) return `Unknown specLevel: ${specLevel}`;
	if (pathClass !== want && !(specLevel === "domain" && pathClass === "domain-root")) {
		return `Path class ${pathClass} does not match specLevel ${specLevel} for ${repoPath}`;
	}
	return null;
}
