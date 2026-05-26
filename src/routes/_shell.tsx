import { createFileRoute, Outlet } from "@tanstack/react-router";

import { AppShell } from "#/components/app-shell";
import { getAuthUser } from "#/server/auth";
import { getRoadmapCatalog, getRoadmapSearchIndex } from "#/server/catalog";

export const Route = createFileRoute("/_shell")({
	beforeLoad: async () => {
		const [user, catalog, searchIndex] = await Promise.all([
			getAuthUser(),
			getRoadmapCatalog(),
			getRoadmapSearchIndex(),
		]);
		return { shellUser: user, catalog, searchIndex };
	},
	component: ShellLayout,
});

function ShellLayout() {
	const { shellUser, catalog, searchIndex } = Route.useRouteContext();
	return (
		<AppShell
			user={shellUser}
			catalogVersions={catalog.versions}
			defaultVersionId={catalog.activeVersionId}
			searchIndex={searchIndex}
		>
			<Outlet />
		</AppShell>
	);
}
