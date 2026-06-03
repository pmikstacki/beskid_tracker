import "@tanstack/react-start/server-only";

import { BeskidAuthClient } from "@beskid/auth-client";
import { getRequest } from "@tanstack/react-start/server";

import { env } from "#/env.server";
import { createOctokit } from "#/lib/github/octokit";
import { canManageRoadmap } from "#/lib/github/permissions";
import { saveAuthHubPairing, isAuthHubPaired } from "#/lib/auth/hub-settings.server";
import { createOctokitForSession } from "#/server/auth-guard.server";
import { getSessionFromRequest } from "#/lib/session/cookie";

export function resolveTrackerPublicUrl(): string | null {
	return env.TRACKER_PUBLIC_URL?.trim().replace(/\/$/, "") ?? null;
}

async function resolvePairingApproverLogin(): Promise<string | null> {
	const configured = env.TRACKER_PAIRING_APPROVER_LOGIN?.trim();
	if (configured) {
		return configured;
	}

	const request = getRequest();
	const session = await getSessionFromRequest(request);

	if (session) {
		const octokit = createOctokitForSession(session);
		if (await canManageRoadmap(octokit, session.login)) {
			return session.login;
		}
	}

	const syncToken = env.GITHUB_SYNC_TOKEN?.trim();
	if (syncToken) {
		const octokit = createOctokit(syncToken);
		const { data: user } = await octokit.users.getAuthenticated();
		if (await canManageRoadmap(octokit, user.login)) {
			return user.login;
		}
	}

	return null;
}

export async function completeAuthHubPairing(input: {
	code: string;
	publicUrl: string;
}): Promise<
	| { ok: true; alreadyPaired: boolean }
	| { ok: false; reason: "auth_required" | "not_configured" | "invalid" }
> {
	const code = input.code.trim();
	const publicUrl = input.publicUrl.trim().replace(/\/$/, "");
	if (!code || !publicUrl) {
		return { ok: false, reason: "invalid" };
	}

	if (isAuthHubPaired()) {
		return { ok: true, alreadyPaired: true };
	}

	const approverLogin = await resolvePairingApproverLogin();
	if (!approverLogin) {
		return { ok: false, reason: "auth_required" };
	}

	const hubUrl = env.AUTH_HUB_PUBLIC_URL?.trim();
	if (!hubUrl) {
		return { ok: false, reason: "not_configured" };
	}

	const client = new BeskidAuthClient({ baseUrl: hubUrl });
	const result = await client.approvePairing({
		code,
		appId: "tracker",
		publicUrl,
		approverLogin,
	});

	saveAuthHubPairing(hubUrl, result.serviceToken);
	return { ok: true, alreadyPaired: false };
}
