import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { createOctokit } from "#/lib/github/octokit";
import {
	getSessionFromRequest,
	type SessionPayload,
} from "#/lib/session/cookie";

export async function requireSession(): Promise<SessionPayload> {
	const request = getRequest();
	const session = await getSessionFromRequest(request);
	if (!session) {
		throw new Error("Unauthorized");
	}
	return session;
}

export const authMiddleware = createMiddleware({ type: "function" }).server(
	async ({ next }) => {
		await requireSession();
		return next();
	},
);

export async function withOctokit<T>(
	fn: (octokit: ReturnType<typeof createOctokit>) => Promise<T>,
): Promise<T> {
	const session = await requireSession();
	return fn(createOctokit(session.accessToken));
}
