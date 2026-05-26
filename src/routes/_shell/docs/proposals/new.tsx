"use client";

import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { DocsHubTabs } from "#/components/docs-hub-tabs";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import { createSpecProposalFn } from "#/server/spec-proposals";

export const Route = createFileRoute("/_shell/docs/proposals/new")({
	component: NewProposalPage,
});

function NewProposalPage() {
	const router = useRouter();
	const [title, setTitle] = useState("");
	const [summary, setSummary] = useState("");

	const mutation = useMutation({
		mutationFn: () =>
			createSpecProposalFn({
				data: { title, summary },
			}),
		onSuccess: async (proposal) => {
			await router.navigate({
				to: "/docs/proposals/$id",
				params: { id: proposal.id },
			});
		},
	});

	return (
		<main className="page-wrap flex max-w-xl flex-col gap-6 py-8">
			<header className="space-y-2">
				<h1 className="text-2xl font-semibold">New proposal</h1>
			</header>
			<DocsHubTabs />
			<form
				className="space-y-4"
				onSubmit={(e) => {
					e.preventDefault();
					mutation.mutate();
				}}
			>
				<div className="space-y-2">
					<Label htmlFor="title">Title</Label>
					<Input
						id="title"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						required
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="summary">Summary</Label>
					<Textarea
						id="summary"
						value={summary}
						onChange={(e) => setSummary(e.target.value)}
						rows={4}
					/>
				</div>
				{mutation.error ? (
					<p className="text-destructive text-sm">{String(mutation.error)}</p>
				) : null}
				<Button type="submit" disabled={mutation.isPending || !title.trim()}>
					Create proposal
				</Button>
			</form>
		</main>
	);
}
