import { createFileRoute, Link } from "@tanstack/react-router";

import { DocsHubTabs } from "#/components/docs-hub-tabs";
import { SpecProposalDetail } from "#/components/spec-proposal-detail";
import { Button } from "#/components/ui/button";
import { getSpecProposalFn } from "#/server/spec-proposals";

export const Route = createFileRoute("/_shell/docs/proposals/$id/")({
	loader: async ({ params }) => {
		const proposal = await getSpecProposalFn({ data: { id: params.id } });
		return { proposal };
	},
	component: ProposalDetailPage,
});

function ProposalDetailPage() {
	const { proposal } = Route.useLoaderData();

	return (
		<main className="page-wrap flex min-h-0 flex-1 flex-col gap-6 py-8">
			<Button type="button" variant="ghost" size="sm" className="w-fit" asChild>
				<Link to="/docs/proposals">← Proposals</Link>
			</Button>
			<DocsHubTabs />
			<SpecProposalDetail proposal={proposal} />
		</main>
	);
}
