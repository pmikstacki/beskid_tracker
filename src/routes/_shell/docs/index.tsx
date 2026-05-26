import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_shell/docs/")({
	beforeLoad: () => {
		throw redirect({ to: "/docs/catalog" });
	},
});
