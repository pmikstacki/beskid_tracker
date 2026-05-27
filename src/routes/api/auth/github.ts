import { createFileRoute } from "@tanstack/react-router";

import { authHubLoginUrl } from "#/lib/auth/hub-handoff";

export const Route = createFileRoute("/api/auth/github")({
	server: {
		handlers: {
			GET: async () => {
				const hubUrl = authHubLoginUrl();
				if (!hubUrl) {
					return new Response(
						"Auth hub is not configured. Set AUTH_HUB_PUBLIC_URL and complete pairing.",
						{ status: 503 },
					);
				}

				const headers = new Headers();
				headers.set("Location", hubUrl);
				return new Response(null, { status: 302, headers });
			},
		},
	},
});
