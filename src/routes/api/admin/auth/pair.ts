import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import {
	approveAuthHubPairing,
	pairingFailureMessage,
} from "#/lib/auth/hub-pairing-flow.server";
import { canManageRoadmap } from "#/lib/github/permissions";
import { getAuthHubServiceToken } from "#/lib/auth/hub-settings.server";
import { getSessionFromRequest } from "#/lib/session/cookie";
import { createOctokitForSession } from "#/server/auth-guard.server";

const bodySchema = z.object({
	code: z.string().min(4),
	publicUrl: z.string().url(),
	force: z.boolean().optional(),
	approverLogin: z.string().min(1).optional(),
});

export const Route = createFileRoute("/api/admin/auth/pair")({
	server: {
		handlers: {
			/** Same contract as Beskid Nexus — approve while signed in as repo admin. */
			POST: async ({ request }) => {
				const token = request.headers
					.get("authorization")
					?.replace(/^Bearer\s+/i, "");
				const serviceToken = getAuthHubServiceToken();
				const isRepair = token && serviceToken && token === serviceToken;

				let parsed: {
					code: string;
					publicUrl: string;
					force?: boolean;
					approverLogin?: string;
				};
				try {
					const json = await request.json();
					const result = bodySchema.safeParse(json);
					if (!result.success) {
						return Response.json({ error: "Invalid payload" }, { status: 400 });
					}
					parsed = result.data;
				} catch {
					return Response.json({ error: "Invalid JSON" }, { status: 400 });
				}

				let approverLogin = parsed.approverLogin?.trim();
				if (!isRepair) {
					const session = await getSessionFromRequest(request);
					if (!session) {
						return Response.json({ error: "Not authenticated" }, { status: 401 });
					}

					const octokit = createOctokitForSession(session);
					if (!(await canManageRoadmap(octokit, session.login))) {
						return Response.json(
							{ error: "Repository admin access required" },
							{ status: 403 },
						);
					}

					approverLogin = session.login;
				} else if (!approverLogin) {
					approverLogin = "service-repair";
				}

				try {
					const result = await approveAuthHubPairing({
						code: parsed.code,
						publicUrl: parsed.publicUrl,
						approverLogin,
					});
					if (!result.ok) {
						return Response.json(
							{ error: pairingFailureMessage(result.reason) },
							{ status: 400 },
						);
					}
					return Response.json({ ok: true, repaired: isRepair || parsed.force });
				} catch (err) {
					const message = err instanceof Error ? err.message : "Pairing failed";
					return Response.json({ error: message }, { status: 400 });
				}
			},
		},
	},
});
