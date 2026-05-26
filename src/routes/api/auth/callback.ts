import { createFileRoute } from "@tanstack/react-router";

import {
	clearOAuthStateCookieHeader,
	exchangeGitHubCode,
	readOAuthStateCookie,
} from "#/lib/auth/github-oauth";
import { createOctokit } from "#/lib/github/octokit";
import {
	clearSessionCookieHeader,
	sealSession,
	sessionCookieHeader,
} from "#/lib/session/cookie";

export const Route = createFileRoute("/api/auth/callback")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const url = new URL(request.url);
				const code = url.searchParams.get("code");
				const state = url.searchParams.get("state");
				const storedState = readOAuthStateCookie(request);

				const headers = new Headers();
				headers.append("Set-Cookie", clearOAuthStateCookieHeader());

				if (!code || !state || !storedState || state !== storedState) {
					headers.set("Location", "/login?error=oauth_state");
					return new Response(null, { status: 302, headers });
				}

				try {
					const accessToken = await exchangeGitHubCode(code);
					const octokit = createOctokit(accessToken);
					const { data: user } = await octokit.rest.users.getAuthenticated();

					const token = await sealSession({
						accessToken,
						login: user.login,
						avatarUrl: user.avatar_url,
						name: user.name,
					});

					headers.append("Set-Cookie", sessionCookieHeader(token));
					headers.set("Location", "/v/v0.2");
				} catch {
					headers.append("Set-Cookie", clearSessionCookieHeader());
					headers.set("Location", "/login?error=oauth_failed");
				}

				return new Response(null, { status: 302, headers });
			},
		},
	},
});
