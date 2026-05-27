import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { AuthPageShell, Button } from "@beskid/ui-react";
import { authHubLoginUrl } from "#/lib/auth/hub-handoff";
import { ThemeToggle } from "#/components/theme-toggle";

const loginSearchSchema = z.object({
	error: z.string().optional(),
});

export const Route = createFileRoute("/login")({
	validateSearch: loginSearchSchema,
	component: LoginPage,
});

function LoginPage() {
	const { error } = Route.useSearch();
	const signInHref = authHubLoginUrl() ?? "/api/auth/github";

	return (
		<div className="page-wrap relative">
			<div className="absolute top-4 right-0">
				<ThemeToggle />
			</div>
			<AuthPageShell
				kicker="Beskid"
				title="Tracker"
				description="Sign in with GitHub to manage tasks on Cyber-Nomad-Collective/beskid. All planning data lives in GitHub — this app is a stateless view and editor."
				error={
					error
						? "Sign-in failed. Check auth hub pairing and try again."
						: undefined
				}
				footer={
					<>
						<a
							href="https://beskid-lang.org/platform-spec/"
							className="underline-offset-4 hover:underline"
						>
							Platform specification
						</a>
						{" · "}
						<a
							href="https://github.com/Cyber-Nomad-Collective/beskid/blob/main/beskid_tracker/README.md"
							target="_blank"
							rel="noopener noreferrer"
							className="underline-offset-4 hover:underline"
						>
							tracker README
						</a>
					</>
				}
			>
				<Button size="lg" asChild className="w-full">
					<a href={signInHref}>Sign in with GitHub</a>
				</Button>
			</AuthPageShell>
		</div>
	);
}
