import "@tanstack/react-start/server-only";

import type { HandoffPayload } from "@beskid/auth-client";
import { buildLoginUrl, verifyHandoffToken } from "@beskid/auth-client";

import {
	getAuthHubServiceToken,
	getAuthHubUrl,
} from "#/lib/auth/hub-settings.server";

export type HubHandoffPayload = HandoffPayload;

export async function verifyHubHandoff(
	token: string,
	expectedApp: "tracker",
): Promise<HubHandoffPayload | null> {
	const serviceToken = getAuthHubServiceToken();
	if (!serviceToken) return null;
	return verifyHandoffToken(serviceToken, token, expectedApp);
}

export function authHubLoginUrl(): string | null {
	const base = getAuthHubUrl();
	if (!base) return null;
	return buildLoginUrl(base, "tracker");
}

export { buildLoginUrl, verifyHandoffToken };
export type { HandoffPayload, IssueHandoffInput } from "@beskid/auth-client";
