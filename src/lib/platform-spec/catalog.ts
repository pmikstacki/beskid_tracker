import type { PlatformSpecCatalogEntry } from "@cyber-nomad-collective/trudoc/platform-spec/catalog";

export type {
	PlatformSpecCatalogEntry,
	PlatformSpecDocumentBundle,
} from "@cyber-nomad-collective/trudoc/platform-spec/catalog";

export interface PlatformSpecCatalogIndex {
	generatedAt: string;
	entries: PlatformSpecCatalogEntry[];
}

export function searchCatalogEntries(
	entries: PlatformSpecCatalogEntry[],
	query: string,
	limit = 40,
): PlatformSpecCatalogEntry[] {
	const q = query.trim().toLowerCase();
	if (!q) return entries.slice(0, limit);

	const scored = entries
		.map((entry) => {
			const hay =
				`${entry.title} ${entry.slug} ${entry.specLevel ?? ""}`.toLowerCase();
			if (hay.includes(q)) {
				const score = entry.title.toLowerCase().startsWith(q)
					? 3
					: entry.slug.toLowerCase().includes(q)
						? 2
						: 1;
				return { entry, score };
			}
			return null;
		})
		.filter(
			(x): x is { entry: PlatformSpecCatalogEntry; score: number } => x != null,
		);

	scored.sort(
		(a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title),
	);
	return scored.slice(0, limit).map((s) => s.entry);
}

export function filterCatalogEntries(
	entries: PlatformSpecCatalogEntry[],
	filters: {
		specLevel?: string;
		pathClass?: string;
		status?: string;
		domain?: string;
	},
): PlatformSpecCatalogEntry[] {
	return entries.filter((entry) => {
		if (filters.specLevel && entry.specLevel !== filters.specLevel)
			return false;
		if (filters.pathClass && entry.pathClass !== filters.pathClass)
			return false;
		if (filters.status && entry.status !== filters.status) return false;
		if (filters.domain) {
			const domain = entry.slug.split("/").filter(Boolean)[1];
			if (domain !== filters.domain) return false;
		}
		return true;
	});
}

export function catalogDomains(entries: PlatformSpecCatalogEntry[]): string[] {
	const domains = new Set<string>();
	for (const entry of entries) {
		const parts = entry.slug.split("/").filter(Boolean);
		if (parts.length >= 2 && parts[0] === "platform-spec") {
			domains.add(parts[1]);
		}
	}
	return [...domains].sort();
}
