import { createFileRoute, Link } from "@tanstack/react-router";

import { DocsHubTabs } from "#/components/docs-hub-tabs";
import { SpecChangeForm } from "#/components/spec-change-form";
import { Button } from "#/components/ui/button";
import { getAuthUser } from "#/server/auth";
import { getSpecProposalFn } from "#/server/spec-proposals";

export const Route = createFileRoute(
	"/_shell/docs/proposals/$id/changes/$changeId",
)({
	loader: async ({ params }) => {
		const [proposal, user] = await Promise.all([
			getSpecProposalFn({ data: { id: params.id } }),
			getAuthUser(),
		]);
		const change = proposal.changes.find((c) => c.id === params.changeId);
		if (!change) throw new Error("Change not found");
		return { proposal, change, user };
	},
	component: EditProposalChangePage,
});

function EditProposalChangePage() {
	const { change, user } = Route.useLoaderData();
	const { id, changeId } = Route.useParams();

	return (
		<main className="page-wrap flex max-w-3xl flex-col gap-6 py-8">
			<Button type="button" variant="ghost" size="sm" className="w-fit" asChild>
				<Link to="/docs/proposals/$id" params={{ id }}>
					← Proposal
				</Link>
			</Button>
			<DocsHubTabs />
			<h1 className="text-xl font-semibold">Edit change</h1>
			<SpecChangeForm
				proposalId={id}
				changeId={changeId}
				initial={{
					changeKind: change.changeKind,
					specLevel: change.specLevel as
						| "domain"
						| "area"
						| "feature"
						| "article"
						| "adr",
					frontmatterJson: change.frontmatterJson,
					bodyMd: change.bodyMd,
				}}
				defaultOwner={
					user
						? {
								name: user.name ?? user.login,
								email: `${user.login}@users.noreply.github.com`,
							}
						: undefined
				}
			/>
		</main>
	);
}
