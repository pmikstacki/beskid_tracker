import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ThemeToggle } from "#/components/theme-toggle";
import { Button } from "#/components/ui/button";

const loginSearchSchema = z.object({
	error: z.string().optional(),
});

export const Route = createFileRoute("/login")({
	validateSearch: loginSearchSchema,
	component: LoginPage,
});

function LoginPage() {
	const { error } = Route.useSearch();

	return (
		<div className="page-wrap relative flex min-h-[70vh] flex-col items-center justify-center py-16">
			<div className="absolute top-0 right-0">
				<ThemeToggle />
			</div>
			<div className="island-shell w-full max-w-md space-y-6 rounded-2xl p-8 text-center">
				<div>
					<p className="island-kicker">Beskid</p>
					<h1 className="display-title mt-2 text-3xl font-bold tracking-tight">
						Tracker
					</h1>
					<p className="text-muted-foreground mt-3 text-sm">
						Sign in with GitHub to manage tasks on{" "}
						<span className="font-medium">Cyber-Nomad-Collective/beskid</span>.
						All planning data lives in GitHub — this app is a stateless view and
						editor.
					</p>
				</div>
				{error ? (
					<p className="text-destructive text-sm" role="alert">
						Sign-in failed. Check OAuth app settings and try again.
					</p>
				) : null}
				<Button size="lg" asChild>
					<a href="/api/auth/github" className="text-primary-foreground">
						Sign in with GitHub
					</a>
				</Button>
				<p className="text-muted-foreground text-xs">
					<a
						href="https://beskid-lang.org/platform-spec/"
						className="underline-offset-4 hover:underline"
					>
						Platform specification
					</a>
					{" · "}
					Planning uses GitHub labels documented in the{" "}
					<a
						href="https://github.com/Cyber-Nomad-Collective/beskid/blob/main/beskid_tracker/README.md"
						target="_blank"
						rel="noopener noreferrer"
						className="underline-offset-4 hover:underline"
					>
						tracker README
					</a>
					.
				</p>
			</div>
		</div>
	);
}
