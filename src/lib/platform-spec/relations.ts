import { beskidDocsUrl } from "#/lib/beskid-docs-origin";

export const SPEC_RELATION_TYPES = [
	"implements",
	"depends-on",
	"tracks",
	"extends",
	"validates",
] as const;

export type SpecRelationType = (typeof SPEC_RELATION_TYPES)[number];

export interface SpecRelation {
	path: string;
	href: string;
	title?: string;
	level?: string;
	relation: SpecRelationType;
	required: boolean;
}

export interface SpecRelationsBlock {
	relations: SpecRelation[];
}

const ROADMAP_SPEC_FENCE = /```roadmap-spec\s*\n([\s\S]*?)\n```/;

export function specPathToHref(path: string): string {
	return beskidDocsUrl(path);
}

export function hierarchyFromSlug(slug: string): {
	domain?: string;
	area?: string;
	feature?: string;
	level: string;
} {
	const parts = slug.split("/").filter(Boolean);
	if (parts[0] !== "platform-spec") {
		return { level: "unknown" };
	}
	const level =
		parts.length <= 2 ? "domain" : parts.length === 3 ? "area" : "feature";
	return {
		domain: parts[1],
		area: parts.length >= 3 ? parts[2] : undefined,
		feature: parts.length >= 4 ? parts[3] : undefined,
		level,
	};
}

export function parseSpecRelationsBlock(body: string): SpecRelationsBlock {
	const match = body.match(ROADMAP_SPEC_FENCE);
	if (!match?.[1]) {
		return { relations: [] };
	}
	try {
		const parsed = JSON.parse(match[1]) as SpecRelationsBlock;
		if (!Array.isArray(parsed.relations)) {
			return { relations: [] };
		}
		return {
			relations: parsed.relations
				.filter(
					(r) => typeof r.path === "string" && r.path.includes("platform-spec"),
				)
				.map((r) => ({
					path: r.path,
					href: r.href ?? specPathToHref(r.path),
					title: r.title,
					level: r.level,
					relation: SPEC_RELATION_TYPES.includes(r.relation as SpecRelationType)
						? (r.relation as SpecRelationType)
						: "tracks",
					required: Boolean(r.required),
				})),
		};
	} catch {
		return { relations: [] };
	}
}

export function serializeSpecRelationsBlock(relations: SpecRelation[]): string {
	if (relations.length === 0) return "";
	const payload: SpecRelationsBlock = { relations };
	return `\n\`\`\`roadmap-spec\n${JSON.stringify(payload, null, 2)}\n\`\`\`\n`;
}

export function upsertSpecRelationsInBody(
	body: string,
	relations: SpecRelation[],
): string {
	const without = body.replace(ROADMAP_SPEC_FENCE, "").trimEnd();
	const block = serializeSpecRelationsBlock(relations);
	return without.length > 0 ? `${without}\n${block}` : block.trim();
}

export function mergeLegacySpecLinks(
	relations: SpecRelation[],
	legacyPaths: { path: string; title?: string }[],
): SpecRelation[] {
	const seen = new Set(relations.map((r) => r.path));
	const merged = [...relations];
	for (const link of legacyPaths) {
		if (seen.has(link.path)) continue;
		seen.add(link.path);
		const hierarchy = hierarchyFromSlug(
			link.path.replace(/^\//, "").replace(/\/$/, "") ||
				link.path.replace(/^\/platform-spec\//, "platform-spec/"),
		);
		merged.push({
			path: link.path,
			href: specPathToHref(link.path),
			title: link.title,
			level: hierarchy.level,
			relation: "tracks",
			required: false,
		});
	}
	return merged;
}
