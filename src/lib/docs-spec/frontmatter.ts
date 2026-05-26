import {
	adrSpecSchema,
	areaSpecSchema,
	articleSpecSchema,
	domainSpecSchema,
	featureSpecSchema,
	platformSpecNodeSchema,
} from "trudoc/schema/content";
import { stringify } from "yaml";
import type { z } from "zod";

export function parseFrontmatterJson(json: string): Record<string, unknown> {
	try {
		const parsed = JSON.parse(json) as unknown;
		if (!parsed || typeof parsed !== "object") return {};
		return parsed as Record<string, unknown>;
	} catch {
		return {};
	}
}

export function validateFrontmatterForLevel(
	specLevel: string,
	frontmatter: Record<string, unknown>,
): { ok: true } | { ok: false; errors: string[] } {
	const schemaForLevel: Record<string, z.ZodType> = {
		domain: domainSpecSchema,
		area: areaSpecSchema,
		feature: featureSpecSchema,
		article: articleSpecSchema,
		adr: adrSpecSchema,
	};

	const schema = schemaForLevel[specLevel] ?? platformSpecNodeSchema;
	const result = schema.safeParse(frontmatter);
	if (result.success) return { ok: true };
	return {
		ok: false,
		errors: result.error.issues.map(
			(i) => `${i.path.join(".") || "frontmatter"}: ${i.message}`,
		),
	};
}

export function serializeFrontmatterYaml(frontmatter: Record<string, unknown>): string {
	return stringify(frontmatter).trimEnd();
}

export function buildMdxFile(frontmatter: Record<string, unknown>, body: string): string {
	const yaml = stringify(frontmatter).trimEnd();
	const normalizedBody = body.startsWith("\n") ? body : `\n${body}`;
	return `---\n${yaml}\n---${normalizedBody.endsWith("\n") ? normalizedBody : `${normalizedBody}\n`}`;
}
