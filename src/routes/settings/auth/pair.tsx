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
});

export const Route = createFileRoute("/settings/auth/pair")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => ({ code: search.code }),
	loader: async ({ deps }) => {
		const code = deps.code?.trim();
		const { paired, defaultPublicUrl } = await getAuthHubPairingStatusFn();

		if (code && defaultPublicUrl && !paired) {
			const auto = await completeAuthHubPairingFn({
				data: { code, publicUrl: defaultPublicUrl },
			});
			if (auto.ok) {
				return {
					paired: true,
					autoPaired: true,
					defaultPublicUrl,
					needsLogin: false,
				};
			}
		}

		const session = await getSessionInfo();
		if (!session.user) {
			const returnTo = code
				? `/settings/auth/pair?code=${encodeURIComponent(code)}`
				: "/settings/auth/pair";
			throw redirect({
				to: "/login",
				search: { redirect: returnTo },
			});
		}
		if (!session.canManage) {
			throw redirect({ to: "/v/v0.2" });
		}

		return {
			paired,
			autoPaired: false,
			defaultPublicUrl,
			needsLogin: false,
		};
	},
	component: AuthHubPairPage,
});

function AuthHubPairPage() {
	const { code } = Route.useSearch();
	const { paired, autoPaired, defaultPublicUrl } = Route.useLoaderData();
	const [publicUrl, setPublicUrl] = useState(defaultPublicUrl);
	const [pairingCode, setPairingCode] = useState(code ?? "");
	const [message, setMessage] = useState<string | null>(
		autoPaired ? "Auth hub paired successfully. Service token stored locally." : null,
	);
	const [error, setError] = useState<string | null>(null);
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
					Approve a pairing code from the auth hub admin. The handoff secret is
					stored locally and never shown in the browser.
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
							{error ? (
								<p className="text-sm text-destructive">{error}</p>
							) : null}
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
