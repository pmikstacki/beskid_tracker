import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AppShell } from "#/components/app-shell";
import { useSeedData } from "#/lib/seed/config";
import { getAuthUser } from "#/server/auth";
import { getAuthHubPairingStatusFn } from "#/server/auth-hub-pairing";
import { getRoadmapCatalog, getRoadmapSearchIndex } from "#/server/catalog";
import { getSessionInfo } from "#/server/roadmap";

export const Route = createFileRoute("/_shell")({
	beforeLoad: async () => {
		if (!useSeedData()) {
			const { paired } = await getAuthHubPairingStatusFn();
			if (!paired) {
				throw redirect({ to: "/settings/auth/pair" });
			}
		}

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
