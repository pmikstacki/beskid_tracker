import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import type { SpecProposalChange } from "#/lib/docs-spec/types";
import { buildMdxFile } from "#/lib/docs-spec/frontmatter";
import { parseFrontmatterJson } from "#/lib/docs-spec/frontmatter";
import { specRelFromRepoPath } from "#/lib/docs-spec/path-rules";
import { loadPlatformSpecDocument } from "#/lib/platform-spec/catalog-loader";

export interface MaterializedWorkspace {
	rootDir: string;
	websiteRoot: string;
	changedRelPaths: string[];
}

async function seedBaselineFile(
	websiteRoot: string,
	repoPath: string,
): Promise<void> {
	const abs = path.join(websiteRoot, repoPath.replace(/^site\/website\//, ""));
	if (fs.existsSync(abs)) return;

	const slug = repoPath
		.replace(/^site\/website\/src\/content\/docs\//, "")
		.replace(/\.(md|mdx)$/i, "")
		.replace(/\/index$/, "");

	try {
		const bundle = await loadPlatformSpecDocument(slug);
		fs.mkdirSync(path.dirname(abs), { recursive: true });
		fs.writeFileSync(
			abs,
			buildMdxFile(bundle.frontmatter, bundle.body),
			"utf8",
		);
		if (bundle.layoutJson) {
			const layoutPath = path.join(path.dirname(abs), "layout.json");
			if (!fs.existsSync(layoutPath)) {
				fs.writeFileSync(layoutPath, `${JSON.stringify(bundle.layoutJson, null, 2)}\n`, "utf8");
			}
		}
	} catch {
		// Baseline unavailable (new file) — skip
	}
}

export async function materializeProposalWorkspace(
	changes: SpecProposalChange[],
): Promise<MaterializedWorkspace> {
	const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "beskid-proposal-"));
	const websiteRoot = path.join(rootDir, "site", "website");
	const specRoot = path.join(websiteRoot, "src", "content", "docs", "platform-spec");
	fs.mkdirSync(specRoot, { recursive: true });

	const changedRelPaths: string[] = [];

	for (const change of changes) {
		const rel = specRelFromRepoPath(change.repoPath);
		changedRelPaths.push(rel);

		if (change.changeKind === "delete") {
			const abs = path.join(specRoot, rel);
			if (fs.existsSync(abs)) fs.unlinkSync(abs);
			continue;
		}

		const abs = path.join(specRoot, rel);
		fs.mkdirSync(path.dirname(abs), { recursive: true });

		const frontmatter = parseFrontmatterJson(change.frontmatterJson);
		fs.writeFileSync(abs, buildMdxFile(frontmatter, change.bodyMd), "utf8");

		if (change.layoutJson) {
			const layout = JSON.parse(change.layoutJson) as Record<string, unknown>;
			const layoutPath = path.join(path.dirname(abs), "layout.json");
			fs.writeFileSync(layoutPath, `${JSON.stringify(layout, null, 2)}\n`, "utf8");
		}
	}

	// Seed parent paths for layout/content checks on updates
	for (const change of changes) {
		if (change.changeKind === "update") {
			await seedBaselineFile(websiteRoot, change.repoPath);
		}
	}

	return { rootDir, websiteRoot, changedRelPaths };
}

export function cleanupMaterializedWorkspace(workspace: MaterializedWorkspace): void {
	fs.rmSync(workspace.rootDir, { recursive: true, force: true });
}
