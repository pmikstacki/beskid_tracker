import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import type { AuthUser } from "#/lib/github/types";
import { getSessionFromRequest } from "#/lib/session/cookie";

export const getAuthUser = createServerFn({ method: "GET" }).handler(
	async (): Promise<AuthUser | null> => {
		const request = getRequest();
		const session = await getSessionFromRequest(request);
		if (!session) return null;
		return {
			login: session.login,
			name: session.name,
			avatarUrl: session.avatarUrl,
		};
	},
);
