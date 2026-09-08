import { createFileRoute, Outlet } from "@tanstack/react-router";

import { AppShell } from "#/components/app-shell";

export const Route = createFileRoute("/_shell")({
	beforeLoad: async () => {
		const [auth, catalogModule, roadmap] = await Promise.all([
			import("#/server/auth"),
			import("#/server/catalog"),
			import("#/server/roadmap"),
		]);
		const { getAuthUser } = auth;
		const { getRoadmapCatalog, getRoadmapSearchIndex } = catalogModule;
		const { getSessionInfo } = roadmap;
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
