import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { RoadmapNotFound } from "#/components/roadmap-not-found";
import { RoadmapRouteError } from "#/components/roadmap-route-error";
import { getContext } from "./integrations/tanstack-query/root-provider";
import type { RouterContext } from "./routes/__root";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	const context = getContext();

	const router = createTanStackRouter({
		routeTree,
		context,
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
		defaultNotFoundComponent: () => <RoadmapNotFound layout="standalone" />,
		defaultErrorComponent: RoadmapRouteError,
	});

	setupRouterSsrQueryIntegration({
		router,
		queryClient: context.queryClient,
	});

	return router;
}

declare module "@tanstack/react-start" {
	interface Register {
		ssr: true;
		router: ReturnType<typeof getRouter>;
	}
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}

export type { RouterContext };
