import { createFileRoute, redirect } from "@tanstack/react-router";

/** Alias for the pairing/setup page (hub links use `/settings/auth/pair` directly). */
export const Route = createFileRoute("/onboarding")({
	beforeLoad: () => {
		throw redirect({ to: "/settings/auth/pair" });
	},
});
