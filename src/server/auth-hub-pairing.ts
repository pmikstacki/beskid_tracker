import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { completeAuthHubPairing } from "#/lib/auth/hub-pairing-flow.server";
import {
	getAuthHubLoginHref,
	getAuthHubPairingStatus,
} from "#/server/auth-hub-pairing.server";

const approveSchema = z.object({
	code: z.string().min(4),
	publicUrl: z.string().url(),
});

export const getAuthHubPairingStatusFn = createServerFn({
	method: "GET",
}).handler(async () => getAuthHubPairingStatus());

export const getAuthHubLoginHrefFn = createServerFn({ method: "GET" }).handler(
	async () => getAuthHubLoginHref(),
);

export const completeAuthHubPairingFn = createServerFn({ method: "POST" })
	.inputValidator(approveSchema)
	.handler(async ({ data }) => {
		const result = await completeAuthHubPairing(data);
		if (!result.ok) {
			if (result.reason === "auth_required") {
				throw new Error(
					"Sign in as a repository admin, or set GITHUB_SYNC_TOKEN or TRACKER_PAIRING_APPROVER_LOGIN on the tracker service",
				);
			}
			throw new Error(
				result.reason === "not_configured"
					? "AUTH_HUB_PUBLIC_URL is not configured"
					: "Invalid pairing request",
			);
		}
		return { ok: true as const };
	});

/** @deprecated use completeAuthHubPairingFn */
export const approveAuthHubPairing = completeAuthHubPairingFn;
