import "@tanstack/react-start/server-only";

import fs from "node:fs";
import path from "node:path";
import {
	parseCatalogFile,
	parseDocumentBundle,
} from "@cyber-nomad-collective/trudoc/platform-spec/catalog";
import type {
	PlatformSpecCatalogIndex,
	PlatformSpecDocumentBundle,
} from "#/lib/platform-spec/catalog";
import {
	platformSpecCatalogUrl,
	platformSpecDocBundleUrl,
} from "#/lib/platform-spec/catalog-url";

const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedCatalog: PlatformSpecCatalogIndex | null = null;
let cachedAt = 0;

function websiteRootFromEnv(): string | null {
	const root = process.env.BESKID_WEBSITE_ROOT?.trim();
	return root && fs.existsSync(root) ? root : null;
}

function loadCatalogFromDisk(websiteRoot: string): PlatformSpecCatalogIndex {
	const catalogPath = path.join(
		websiteRoot,
		"src",
		"generated",
		"platform-spec-catalog.json",
	);
	if (!fs.existsSync(catalogPath)) {
		throw new Error(
			`Missing catalog at ${catalogPath} — run generate:platform-spec-catalog`,
		);
	}
	const raw = JSON.parse(fs.readFileSync(catalogPath, "utf8")) as unknown;
	return parseCatalogFile(raw) as PlatformSpecCatalogIndex;
}

function loadDocumentFromDisk(
	websiteRoot: string,
	slug: string,
): PlatformSpecDocumentBundle {
	const encoded = slug.replace(/\//g, "--");
	const bundlePath = path.join(
		websiteRoot,
		"src",
		"generated",
		"platform-spec-docs",
		`${encoded}.json`,
	);
	if (!fs.existsSync(bundlePath)) {
		throw new Error(`Document bundle not found for slug: ${slug}`);
	}
	const raw = JSON.parse(fs.readFileSync(bundlePath, "utf8")) as unknown;
	return parseDocumentBundle(raw);
}

export async function loadPlatformSpecCatalog(): Promise<PlatformSpecCatalogIndex> {
	const now = Date.now();
	if (cachedCatalog && now - cachedAt < CACHE_TTL_MS) {
		return cachedCatalog;
	}

	const localRoot = websiteRootFromEnv();
	if (localRoot) {
		cachedCatalog = loadCatalogFromDisk(localRoot);
		cachedAt = now;
		return cachedCatalog;
	}

	const url = platformSpecCatalogUrl();
	const response = await fetch(url, {
		headers: { Accept: "application/json" },
	});
	if (!response.ok) {
		if (cachedCatalog) return cachedCatalog;
		throw new Error(
			`Failed to load platform-spec catalog (${response.status}) from ${url}`,
		);
	}

	const parsed = parseCatalogFile(await response.json());
	cachedCatalog = parsed as PlatformSpecCatalogIndex;
	cachedAt = now;
	return cachedCatalog;
}

export async function loadPlatformSpecDocument(
	slug: string,
): Promise<PlatformSpecDocumentBundle> {
	const localRoot = websiteRootFromEnv();
	if (localRoot) {
		return loadDocumentFromDisk(localRoot, slug);
	}

	const url = platformSpecDocBundleUrl(slug);
	const response = await fetch(url, {
		headers: { Accept: "application/json" },
	});
	if (!response.ok) {
		throw new Error(`Failed to load document (${response.status}) from ${url}`);
	}
	return parseDocumentBundle(await response.json());
}
