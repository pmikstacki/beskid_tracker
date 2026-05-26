import { createFileRoute, Outlet } from "@tanstack/react-router";

import { AppShell } from "#/components/app-shell";
import { getAuthUser } from "#/server/auth";
import { getRoadmapCatalog, getRoadmapSearchIndex } from "#/server/catalog";
import { getSessionInfo } from "#/server/roadmap";

export const Route = createFileRoute("/_shell")({
	beforeLoad: async () => {
		const [user, catalog, searchIndex, session] = await Promise.all([
			getAuthUser(),
			getRoadmapCatalog(),
			getRoadmapSearchIndex(),
			getSessionInfo(),
		]);
		return {
			shellUser: user,
			catalog,
			searchIndex,
			canManageRoadmap: session.canManage,
		};
	},
	component: ShellLayout,
});

function ShellLayout() {
	const { shellUser, catalog, searchIndex, canManageRoadmap } =
		Route.useRouteContext();
	return (
		<AppShell
			user={shellUser}
			canManageRoadmap={canManageRoadmap}
			catalogVersions={catalog.versions}
			defaultVersionId={catalog.activeVersionId}
			searchIndex={searchIndex}
		>
			<Outlet />
		</AppShell>
	);
}
