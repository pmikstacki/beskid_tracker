import "@tanstack/react-start/server-only";

import { BeskidAuthClient } from "@beskid/auth-client";
import { getRequest } from "@tanstack/react-start/server";

import { env } from "#/env.server";
import { createOctokit } from "#/lib/github/octokit";
import { canManageRoadmap } from "#/lib/github/permissions";
import {
	getStoredPairingApproverLogin,
	saveAuthHubPairing,
	savePairingApproverLogin,
} from "#/lib/auth/hub-settings.server";
import { resolveTrackerPublicOrigin } from "#/lib/sync/github-webhook-config";
import { createOctokitForSession } from "#/server/auth-guard.server";
import { getSessionFromRequest } from "#/lib/session/cookie";

/** Public origin sent to the auth hub when approving pairing (env, then DB, then fallback). */
export function resolveTrackerPublicUrlForPairing(): string {
	const fromEnv = env.TRACKER_PUBLIC_URL?.trim().replace(/\/$/, "");
	return fromEnv || resolveTrackerPublicOrigin();
}

export function pairingFailureMessage(
	reason: "auth_required" | "not_configured" | "invalid",
): string {
	switch (reason) {
		case "auth_required":
			return "Server cannot approve pairing: set TRACKER_PAIRING_APPROVER_LOGIN or GITHUB_SYNC_TOKEN on the tracker, or sign in as a repo admin.";
		case "not_configured":
			return "AUTH_HUB_PUBLIC_URL is not configured on the tracker.";
		default:
			return "Invalid pairing request (missing code or public URL).";
	}
}

async function resolvePairingApproverLogin(): Promise<string | null> {
	const configured = env.TRACKER_PAIRING_APPROVER_LOGIN?.trim();
	if (configured) {
		return configured;
	}

	const stored = getStoredPairingApproverLogin()?.trim();
	if (stored) {
		return stored;
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

/** Same contract as Beskid Nexus `POST /api/admin/auth/pair`. */
export async function approveAuthHubPairing(input: {
	code: string;
	publicUrl: string;
	approverLogin: string;
}): Promise<
	{ ok: true } | { ok: false; reason: "not_configured" | "invalid" }
> {
	const code = input.code.trim();
	const publicUrl = input.publicUrl.trim().replace(/\/$/, "");
	const approverLogin = input.approverLogin.trim();
	if (!code || !publicUrl || !approverLogin) {
		return { ok: false, reason: "invalid" };
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
	return { ok: true };
}

/** Server-side autopair (hub link or sync token). */
export async function completeAuthHubPairing(input: {
	code: string;
	publicUrl: string;
}): Promise<
	| { ok: true }
	| { ok: false; reason: "auth_required" | "not_configured" | "invalid" }
> {
	const code = input.code.trim();
	const publicUrl = input.publicUrl.trim().replace(/\/$/, "");
	if (!code || !publicUrl) {
		return { ok: false, reason: "invalid" };
	}

	const approverLogin = await resolvePairingApproverLogin();
	if (!approverLogin) {
		return { ok: false, reason: "auth_required" };
	}

	const result = await approveAuthHubPairing({
		code,
		publicUrl,
		approverLogin,
	});
	if (!result.ok) {
		return result;
	}
	return { ok: true };
}
