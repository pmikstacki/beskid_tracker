import { AuthPageShell, Button } from "@beskid/ui-react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ThemeToggle } from "#/components/theme-toggle";
import { sanitizePostLoginPath } from "#/lib/session/post-login-redirect";

const loginSearchSchema = z.object({
	error: z.string().optional(),
	redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
	validateSearch: loginSearchSchema,
	loaderDeps: ({ search }) => ({ redirect: search.redirect }),
	loader: async ({ deps }) => {
		const redirectTo = sanitizePostLoginPath(deps.redirect);
		const signInHref = redirectTo
			? `/api/auth/github?next=${encodeURIComponent(redirectTo)}`
			: "/api/auth/github";
		return { signInHref };
	},
	component: LoginPage,
});

function LoginPage() {
	const { error } = Route.useSearch();
	const { signInHref } = Route.useLoaderData();

	return (
		<div className="page-wrap relative">
			<div className="absolute top-4 right-0">
				<ThemeToggle />
			</div>
			<AuthPageShell
				kicker="Beskid"
				title="Tracker"
				description="Sign in through the Beskid auth hub to manage tracker-native roadmap tasks. GitHub is used only for public bug issues."
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
