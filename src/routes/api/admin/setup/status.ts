import { createFileRoute } from "@tanstack/react-router";

import { getAuthHubSetupStatus } from "#/server/auth-hub-setup.server";

export const Route = createFileRoute("/api/admin/setup/status")({
	server: {
		handlers: {
			GET: async () => {
				return Response.json(getAuthHubSetupStatus());
			},
		},
	},
});
