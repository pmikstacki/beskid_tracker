import { env } from "#/env";

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";

export const OAUTH_STATE_COOKIE = "beskid_oauth_state";

export function buildGitHubAuthorizeUrl(state: string): string {
	const url = new URL(GITHUB_AUTHORIZE_URL);
	url.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
	url.searchParams.set("redirect_uri", env.GITHUB_OAUTH_CALLBACK_URL);
	url.searchParams.set("scope", "read:user repo");
	url.searchParams.set("state", state);
	return url.toString();
}

export async function exchangeGitHubCode(code: string): Promise<string> {
	const response = await fetch(GITHUB_TOKEN_URL, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			client_id: env.GITHUB_CLIENT_ID,
			client_secret: env.GITHUB_CLIENT_SECRET,
			code,
			redirect_uri: env.GITHUB_OAUTH_CALLBACK_URL,
		}),
	});

	if (!response.ok) {
		throw new Error(`GitHub token exchange failed (${response.status})`);
	}

	const payload = (await response.json()) as {
		access_token?: string;
		error?: string;
		error_description?: string;
	};

	if (!payload.access_token) {
		throw new Error(
			payload.error_description ?? payload.error ?? "Missing access token",
		);
	}

	return payload.access_token;
}

export function oauthStateCookieHeader(state: string): string {
	const secure = env.NODE_ENV === "production" ? "; Secure" : "";
	return `${OAUTH_STATE_COOKIE}=${encodeURIComponent(state)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure}`;
}

export function readOAuthStateCookie(request: Request): string | null {
	const header = request.headers.get("cookie");
	if (!header) return null;
	for (const part of header.split(";")) {
		const [name, ...rest] = part.trim().split("=");
		if (name === OAUTH_STATE_COOKIE) {
			return decodeURIComponent(rest.join("="));
		}
	}
	return null;
}

export function clearOAuthStateCookieHeader(): string {
	return `${OAUTH_STATE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
