import { BeskidAuthClient } from "@beskid/auth-client";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { env } from "#/env";
import { saveAuthHubPairing } from "#/lib/auth/hub-settings";
import { createOctokit } from "#/lib/github/octokit";
import { canManageRoadmap } from "#/lib/github/permissions";

const approveSchema = z.object({
	code: z.string().min(4),
	publicUrl: z.string().url(),
});

export const approveAuthHubPairing = createServerFn({ method: "POST" })
	.inputValidator(approveSchema)
	.handler(async ({ data }) => {
		const { requireSession, createOctokitForSession } = await import(
			"#/server/auth-guard.server"
		);
		const session = await requireSession();
		const syncToken = env.GITHUB_SYNC_TOKEN?.trim();
		const octokit = syncToken
			? createOctokit(syncToken)
			: createOctokitForSession(session);
		if (!(await canManageRoadmap(octokit, session.login))) {
			throw new Error("Only repository admins can approve auth hub pairing");
		}

		const hubUrl =
			env.AUTH_HUB_PUBLIC_URL?.trim() ??
			(() => {
				throw new Error("AUTH_HUB_PUBLIC_URL is not configured");
			})();

		const client = new BeskidAuthClient({ baseUrl: hubUrl });
		const result = await client.approvePairing({
			code: data.code,
			appId: "tracker",
			publicUrl: data.publicUrl,
			approverLogin: session.login,
		});

		saveAuthHubPairing(hubUrl, result.serviceToken);

		return { ok: true as const };
	});
