import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import {
	approveAuthHubPairing,
	pairingFailureMessage,
} from "#/lib/auth/hub-pairing-flow.server";
import { createOctokitForSession } from "#/server/auth-guard.server";
import { canManageRoadmap } from "#/lib/github/permissions";
import { getSessionFromRequest } from "#/lib/session/cookie";

const bodySchema = z.object({
	code: z.string().min(4),
	publicUrl: z.string().url(),
});

export const Route = createFileRoute("/api/admin/auth/pair")({
	server: {
		handlers: {
			/** Same contract as Beskid Nexus — approve while signed in as repo admin. */
			POST: async ({ request }) => {
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

				let json: unknown;
				try {
					json = await request.json();
				} catch {
					return Response.json({ error: "Invalid JSON" }, { status: 400 });
				}

				const parsed = bodySchema.safeParse(json);
				if (!parsed.success) {
					return Response.json({ error: "Invalid payload" }, { status: 400 });
				}

				try {
					const result = await approveAuthHubPairing({
						...parsed.data,
						approverLogin: session.login,
					});
					if (!result.ok) {
						return Response.json(
							{ error: pairingFailureMessage(result.reason) },
							{ status: 400 },
						);
					}
					return Response.json({ ok: true });
				} catch (err) {
					const message =
						err instanceof Error ? err.message : "Pairing failed";
					return Response.json({ error: message }, { status: 400 });
				}
			},
		},
	},
});
