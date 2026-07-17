import "@tanstack/react-start/server-only";

import { BeskidAuthClient } from "@beskid/auth-client";
import { authHubLoginUrl } from "#/lib/auth/hub-handoff.server";
import { resolveTrackerPublicUrlForPairing } from "#/lib/auth/hub-pairing-flow.server";
import { getAuthHubUrl, isAuthHubPaired } from "#/lib/auth/hub-settings.server";


/** Discover the hub registration without exposing service credentials. */
async function discoverAuthHub() {
	const hubUrl = getAuthHubUrl();
	if (!hubUrl) return { available: false as const, appFound: false, remotePaired: false };

	try {
		// The deployed npm client may lag the source package until the next
		// registry publish; keep the runtime contract compatible during rollout.
		const client = new BeskidAuthClient({ baseUrl: hubUrl }) as BeskidAuthClient & {
			discoverApp?: (appId: "tracker") => Promise<{
				app: { label: string } | null;
				pairing: { paired: boolean };
			}>;
		};
		const discovery = client.discoverApp
			? await client.discoverApp("tracker")
			: await discoverLegacyHub(hubUrl);
		return {
			available: true as const,
			appFound: discovery.app !== null,
			remotePaired: discovery.pairing.paired,
			appLabel: discovery.app?.label ?? null,
		};
	} catch {
		// Discovery is advisory; local pairing remains authoritative for access.
		return { available: false as const, appFound: false, remotePaired: false };
	}
}

async function discoverLegacyHub(hubUrl: string) {
	const [appsResponse, pairingResponse] = await Promise.all([
		fetch(`${hubUrl.replace(/\/$/, "")}/api/v1/apps`),
		fetch(`${hubUrl.replace(/\/$/, "")}/api/v1/pairing/status?appId=tracker`),
	]);
	if (!appsResponse.ok || !pairingResponse.ok) throw new Error("Auth hub discovery failed");
	const apps = (await appsResponse.json()) as { apps?: Array<{ id: string; label?: string }> };
	const pairing = (await pairingResponse.json()) as { paired?: boolean };
	const app = apps.apps?.find((entry) => entry.id === "tracker") ?? null;
	return { app: app ? { label: app.label ?? "Beskid Tracker" } : null, pairing: { paired: pairing.paired === true } };
}

export async function getAuthHubPairingStatus() {
	const localPaired = isAuthHubPaired();
	return {
		paired: localPaired,
		localPaired,
		discovery: await discoverAuthHub(),
		defaultPublicUrl: resolveTrackerPublicUrlForPairing(),
	};
}

export function getAuthHubLoginHref() {
	return { signInHref: authHubLoginUrl() ?? "/api/auth/github" };
}
