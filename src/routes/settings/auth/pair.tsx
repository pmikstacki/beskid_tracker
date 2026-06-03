import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { AuthHubSetupWizard } from "#/components/auth-hub-setup-wizard";
import { ThemeToggle } from "#/components/theme-toggle";
import { getAuthHubPairingStatusFn } from "#/server/auth-hub-pairing";
import { getAuthHubSetupStatusFn } from "#/server/auth-hub-setup";

const searchSchema = z.object({
	code: z.string().optional(),
	pair_error: z.string().optional(),
});

export const Route = createFileRoute("/settings/auth/pair")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => ({
		code: search.code,
		pair_error: search.pair_error,
	}),
	loader: async ({ deps }) => {
		const code = deps.code?.trim();
		if (code) {
			throw redirect({
				to: "/api/auth/pair",
				search: { code },
			});
		}

		const [setup, pairing] = await Promise.all([
			getAuthHubSetupStatusFn(),
			getAuthHubPairingStatusFn(),
		]);

		return {
			paired: pairing.paired,
			pairError: deps.pair_error?.trim() || null,
			setupDefaults: {
				defaultAuthHubUrl:
					setup.defaultAuthHubUrl ??
					setup.authHubUrl ??
					"https://auth.beskid-lang.org",
				defaultTrackerPublicUrl: setup.defaultTrackerPublicUrl,
				storedApproverLogin: setup.storedApproverLogin ?? "",
				hasSessionSecret: setup.hasSessionSecret,
				hasSetupToken: setup.hasSetupToken,
			},
		};
	},
	component: AuthHubPairPage,
});

function AuthHubPairPage() {
	const router = useRouter();
	const { paired, pairError, setupDefaults } = Route.useLoaderData();

	return (
		<div className="page-wrap relative min-h-screen py-10">
			<div className="absolute top-4 right-0">
				<ThemeToggle />
			</div>
			<div className="mx-auto max-w-xl space-y-6">
				<div className="text-center">
					<p className="island-kicker">Beskid</p>
					<h1 className="mt-2 text-2xl font-semibold">
						{paired ? "Auth hub pairing" : "Tracker onboarding"}
					</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						{paired
							? "This tracker is connected to the shared auth hub."
							: "Pair with the auth hub before sign-in and sync work. Same flow as Beskid Nexus setup."}
					</p>
				</div>

				{paired ? (
					<div className="space-y-4 text-center">
						<p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
							Tracker is already paired with the auth hub.
						</p>
						<Link
							to="/"
							className="text-sm text-primary underline underline-offset-4"
						>
							Continue to roadmap
						</Link>
					</div>
				) : (
					<>
						{pairError ? (
							<p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
								{pairError}
							</p>
						) : null}
						<AuthHubSetupWizard
							{...setupDefaults}
							onComplete={() => {
								void router.navigate({ to: "/" });
							}}
						/>
					</>
				)}
			</div>
		</div>
	);
}
