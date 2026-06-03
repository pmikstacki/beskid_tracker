import {
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Input,
	Label,
} from "@beskid/ui-react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import {
	completeAuthHubPairingFn,
	getAuthHubPairingStatusFn,
} from "#/server/auth-hub-pairing";
import { getSessionInfo } from "#/server/roadmap";

const searchSchema = z.object({
	code: z.string().optional(),
	paired: z.string().optional(),
	pair_error: z.string().optional(),
});

export const Route = createFileRoute("/settings/auth/pair")({
	validateSearch: searchSchema,
	server: {
		handlers: {
			GET: async ({ request }) => {
				const { respondToHubPairingLink } = await import(
					"#/lib/auth/hub-pairing-handler.server"
				);
				const response = await respondToHubPairingLink(request);
				if (response) return response;
			},
		},
	},
	loaderDeps: ({ search }) => ({
		code: search.code,
		paired: search.paired,
		pair_error: search.pair_error,
	}),
	loader: async ({ deps }) => {
		const code = deps.code?.trim();
		const pairError = deps.pair_error?.trim();
		const justPaired = deps.paired === "1";
		const { paired, defaultPublicUrl } = await getAuthHubPairingStatusFn();

		if (justPaired || paired) {
			return {
				paired: true,
				autoPaired: justPaired,
				defaultPublicUrl,
				autoPairError: null,
				needsLogin: false,
			};
		}

		if (pairError) {
			return {
				paired: false,
				autoPaired: false,
				defaultPublicUrl,
				autoPairError: pairError,
				needsLogin: false,
			};
		}

		// Hub ?code= links: approve on the server (no login). Handler above runs first;
		// loader fallback covers builds where the handler is not invoked.
		if (code && !paired) {
			try {
				const result = await completeAuthHubPairingFn({
					data: { code, publicUrl: defaultPublicUrl },
				});
				return {
					paired: true,
					autoPaired: !result.alreadyPaired,
					defaultPublicUrl,
					autoPairError: null,
					needsLogin: false,
				};
			} catch (err) {
				return {
					paired: false,
					autoPaired: false,
					defaultPublicUrl,
					autoPairError:
						err instanceof Error ? err.message : "Pairing failed",
					needsLogin: false,
				};
			}
		}

		const session = await getSessionInfo();
		if (!session.user) {
			throw redirect({
				to: "/login",
				search: { redirect: "/settings/auth/pair" },
			});
		}
		if (!session.canManage) {
			throw redirect({ to: "/v/v0.2" });
		}

		return {
			paired: false,
			autoPaired: false,
			defaultPublicUrl,
			autoPairError: null,
			needsLogin: false,
		};
	},
	component: AuthHubPairPage,
});

function AuthHubPairPage() {
	const { code } = Route.useSearch();
	const { paired, autoPaired, defaultPublicUrl, autoPairError } =
		Route.useLoaderData();
	const [publicUrl, setPublicUrl] = useState(defaultPublicUrl);
	const [pairingCode, setPairingCode] = useState(code ?? "");
	const [message, setMessage] = useState<string | null>(
		autoPaired ? "Auth hub paired successfully. Service token stored locally." : null,
	);
	const [error, setError] = useState<string | null>(autoPairError);
	const [busy, setBusy] = useState(false);

	async function onApprove(event: React.FormEvent) {
		event.preventDefault();
		setBusy(true);
		setError(null);
		setMessage(null);
		try {
			await completeAuthHubPairingFn({
				data: {
					code: pairingCode.trim(),
					publicUrl: publicUrl.trim(),
				},
			});
			setMessage("Auth hub paired successfully. Service token stored locally.");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Pairing failed");
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="mx-auto max-w-lg space-y-6 p-6">
			<div>
				<Link
					to="/v/v0.2"
					className="text-sm text-muted-foreground hover:underline"
				>
					← Back to roadmap
				</Link>
				<h1 className="mt-2 text-2xl font-semibold">Auth hub pairing</h1>
				<p className="text-sm text-muted-foreground">
					Approve a pairing code from the auth hub admin. The service token is
					stored on the server and never shown in the browser.
				</p>
			</div>

			{paired ? (
				<p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
					Tracker is already paired with the auth hub.
				</p>
			) : null}

			{message ? (
				<p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-green-700 dark:text-green-400">
					{message}
				</p>
			) : null}

			{error ? (
				<p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
					{error}
				</p>
			) : null}

			{paired && autoPaired ? null : (
				<Card>
					<CardHeader>
						<CardTitle>Approve pairing</CardTitle>
					</CardHeader>
					<CardContent>
						<form className="space-y-4" onSubmit={onApprove}>
							<div className="space-y-2">
								<Label htmlFor="code">Pairing code</Label>
								<Input
									id="code"
									value={pairingCode}
									onChange={(e) => setPairingCode(e.target.value)}
									required
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="publicUrl">This app public URL</Label>
								<Input
									id="publicUrl"
									type="url"
									placeholder="https://tracker.example.com"
									value={publicUrl}
									onChange={(e) => setPublicUrl(e.target.value)}
									required
								/>
							</div>
							<Button type="submit" disabled={busy}>
								{busy ? "Approving…" : "Approve pairing"}
							</Button>
						</form>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
