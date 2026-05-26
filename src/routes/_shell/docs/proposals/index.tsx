import { createFileRoute, Link } from "@tanstack/react-router";

import { DocsHubTabs } from "#/components/docs-hub-tabs";
import { SpecProposalList } from "#/components/spec-proposal-list";
import { Button } from "#/components/ui/button";
import { getAuthUser } from "#/server/auth";
import { listSpecProposalsFn } from "#/server/spec-proposals";

export const Route = createFileRoute("/_shell/docs/proposals/")({
	loader: async () => {
		const user = await getAuthUser();
		const proposals = user ? await listSpecProposalsFn() : [];
		return { proposals, user };
	},
	component: DocsProposalsPage,
});

function DocsProposalsPage() {
	const { proposals, user } = Route.useLoaderData();

	return (
		<main className="page-wrap flex min-h-0 flex-1 flex-col gap-6 py-8">
			<header className="flex flex-wrap items-start justify-between gap-4">
				<div className="space-y-2">
					<p className="island-kicker">Platform specification</p>
					<h1 className="text-2xl font-semibold">Proposals</h1>
					<p className="text-muted-foreground max-w-2xl text-sm">
						Draft platform-spec edits locally, validate with trudoc, then open a GitHub
						pull request.
					</p>
				</div>
				{user ? (
					<Button type="button" asChild>
						<Link to="/docs/proposals/new">New proposal</Link>
					</Button>
				) : (
					<Button type="button" variant="outline" asChild>
						<Link to="/login">Sign in to create proposals</Link>
					</Button>
				)}
			</header>
			<DocsHubTabs />
			{user ? (
				<SpecProposalList proposals={proposals} />
			) : (
				<p className="text-muted-foreground text-sm">Sign in to view and manage proposals.</p>
			)}
		</main>
	);
}
