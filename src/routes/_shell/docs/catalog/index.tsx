import { createFileRoute } from "@tanstack/react-router";

import { DocsHubTabs } from "#/components/docs-hub-tabs";
import { SpecCatalogTable } from "#/components/spec-catalog-table";
import { getPlatformSpecCatalog } from "#/server/platform-spec-catalog";

export const Route = createFileRoute("/_shell/docs/catalog/")({
	loader: async () => {
		const catalog = await getPlatformSpecCatalog();
		return { catalog };
	},
	component: DocsCatalogPage,
});

function DocsCatalogPage() {
	const { catalog } = Route.useLoaderData();

	return (
		<main className="page-wrap flex min-h-0 flex-1 flex-col gap-6 py-8">
			<header className="space-y-2">
				<p className="island-kicker">Platform specification</p>
				<h1 className="text-2xl font-semibold">Docs management</h1>
				<p className="text-muted-foreground max-w-2xl text-sm">
					Browse the full normative tree (including ADRs). Draft changes as proposals and
					open pull requests to the superrepo.
				</p>
			</header>
			<DocsHubTabs />
			<SpecCatalogTable entries={catalog.entries} />
		</main>
	);
}
