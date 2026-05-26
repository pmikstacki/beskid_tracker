import { createFileRoute } from "@tanstack/react-router";

import {
	buildGitHubAuthorizeUrl,
	oauthStateCookieHeader,
} from "#/lib/auth/github-oauth";

export const Route = createFileRoute("/api/auth/github")({
	server: {
		handlers: {
			GET: async () => {
				const state = crypto.randomUUID();
				const headers = new Headers();
				headers.set("Location", buildGitHubAuthorizeUrl(state));
				headers.append("Set-Cookie", oauthStateCookieHeader(state));
				return new Response(null, { status: 302, headers });
			},
		},
	},
});
