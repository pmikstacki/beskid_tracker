import { createFileRoute, redirect } from "@tanstack/react-router";

import { BESKID_STANDARD_URL } from "#/lib/beskid-docs-origin";

export const Route = createFileRoute("/_shell/docs/")({
	beforeLoad: () => {
		throw redirect({
			href: BESKID_STANDARD_URL,
		});
	},
});
