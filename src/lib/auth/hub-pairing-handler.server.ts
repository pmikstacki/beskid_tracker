import "@tanstack/react-start/server-only";

import {
	completeAuthHubPairing,
	pairingFailureMessage,
	resolveTrackerPublicUrlForPairing,
} from "#/lib/auth/hub-pairing-flow.server";

function redirectToPairResultPage(
	request: Request,
	params: { paired?: string; pair_error?: string },
): Response {
	const url = new URL("/settings/auth/pair", request.url);
	if (params.paired) url.searchParams.set("paired", params.paired);
	if (params.pair_error) url.searchParams.set("pair_error", params.pair_error);
	return new Response(null, {
		status: 302,
		headers: { Location: `${url.pathname}${url.search}` },
	});
}

/** Hub pairing links with ?code= — approve server-side, then redirect with status. */
export async function respondToHubPairingLink(
	request: Request,
): Promise<Response | null> {
	const url = new URL(request.url);
	const code = url.searchParams.get("code")?.trim();
	if (!code) return null;
	if (url.searchParams.get("paired") || url.searchParams.get("pair_error")) {
		return null;
	}

	try {
		const result = await completeAuthHubPairing({
			code,
			publicUrl: resolveTrackerPublicUrlForPairing(),
		});
		if (!result.ok) {
			return redirectToPairResultPage(request, {
				pair_error: pairingFailureMessage(result.reason),
			});
		}
		return redirectToPairResultPage(request, { paired: "1" });
	} catch (err) {
		const message = err instanceof Error ? err.message : "Pairing failed";
		return redirectToPairResultPage(request, { pair_error: message });
	}
}
