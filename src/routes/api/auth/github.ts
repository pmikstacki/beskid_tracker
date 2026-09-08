import { createFileRoute } from "@tanstack/react-router";

import { sanitizePostLoginPath } from "#/lib/session/post-login-redirect";

export const Route = createFileRoute("/api/auth/github")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const url = new URL(request.url);
				const next = sanitizePostLoginPath(url.searchParams.get("next"));
				const outpost = new URL("/outpost.goauthentik.io/start", url.origin);
				outpost.searchParams.set("rd", new URL(next || "/", url.origin).toString());
				return Response.redirect(outpost, 302);
			},
		},
	},
});
