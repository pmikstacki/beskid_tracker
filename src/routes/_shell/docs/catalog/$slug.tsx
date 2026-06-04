import { createFileRoute, Link } from "@tanstack/react-router";

import { DocsHubTabs } from "#/components/docs-hub-tabs";
import { MarkdownContent } from "#/components/markdown-content";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { beskidDocsUrl } from "#/lib/beskid-docs-origin";
import { decodeCatalogDocSlug } from "#/lib/platform-spec/catalog-url";
import { getPlatformSpecDocument } from "#/server/platform-spec-catalog";

export const Route = createFileRoute("/_shell/docs/catalog/$slug")({
	loader: async ({ params }) => {
		const slug = decodeCatalogDocSlug(params.slug);
		const doc = await getPlatformSpecDocument({ data: { slug } });
		return { doc, slug };
	},
	component: DocsCatalogDocumentPage,
});

function DocsCatalogDocumentPage() {
	const { doc, slug } = Route.useLoaderData();

	return (
		<main className="page-wrap flex min-h-0 flex-1 flex-col gap-6 py-8">
			<div className="flex flex-wrap items-center gap-2">
				<Button type="button" variant="ghost" size="sm" asChild>
					<Link to="/docs/catalog">← Catalog</Link>
				</Button>
				<a
					href={beskidDocsUrl(`/${slug}/`)}
					target="_blank"
					rel="noreferrer"
					className="text-primary text-sm hover:underline"
				>
					View on beskid-lang.org
				</a>
			</div>
			<DocsHubTabs />
			<header className="space-y-2">
				<h1 className="text-2xl font-semibold">
					{String(doc.frontmatter.title ?? slug)}
				</h1>
				<div className="flex flex-wrap gap-2">
					<Badge variant="outline">
						{String(doc.frontmatter.specLevel ?? "—")}
					</Badge>
					{doc.frontmatter.status ? (
						<Badge variant="secondary">{String(doc.frontmatter.status)}</Badge>
					) : null}
				</div>
				<p className="text-muted-foreground font-mono text-xs">
					{doc.repoPath}
				</p>
			</header>
			<MarkdownContent size="md">{doc.body}</MarkdownContent>
		</main>
	);
}
