import { authHubLoginUrl } from "#/lib/auth/hub-handoff.server";
import { resolveTrackerPublicUrlForPairing } from "#/lib/auth/hub-pairing-flow.server";
import { isAuthHubPaired } from "#/lib/auth/hub-settings.server";

export function getAuthHubPairingStatus() {
	return {
		paired: isAuthHubPaired(),
		defaultPublicUrl: resolveTrackerPublicUrlForPairing(),
	};
}

export function getAuthHubLoginHref() {
	return { signInHref: authHubLoginUrl() ?? "/api/auth/github" };
}
