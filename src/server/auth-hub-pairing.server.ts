import { authHubLoginUrl } from "#/lib/auth/hub-handoff.server";
import { isAuthHubPaired } from "#/lib/auth/hub-settings.server";

export function getAuthHubPairingStatus() {
	return { paired: isAuthHubPaired() };
}

export function getAuthHubLoginHref() {
	return { signInHref: authHubLoginUrl() ?? "/api/auth/github" };
}
