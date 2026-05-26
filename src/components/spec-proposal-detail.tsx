"use client";

import { Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import type { ProposalValidationResult, SpecProposalWithChanges } from "#/lib/docs-spec/types";
import {
	deleteSpecProposalChangeFn,
	refreshSpecProposalPrFn,
	submitSpecProposalFn,
	validateSpecProposalFn,
} from "#/server/spec-proposals";

interface SpecProposalDetailProps {
	proposal: SpecProposalWithChanges;
}

export function SpecProposalDetail({ proposal: initial }: SpecProposalDetailProps) {
	const router = useRouter();
	const validation = initial.validationJson
		? (JSON.parse(initial.validationJson) as ProposalValidationResult)
		: null;

	const validateMutation = useMutation({
		mutationFn: () => validateSpecProposalFn({ data: { id: initial.id } }),
		onSuccess: async () => {
			await router.invalidate();
		},
	});

	const submitMutation = useMutation({
		mutationFn: () => submitSpecProposalFn({ data: { id: initial.id } }),
		onSuccess: async () => {
			await router.invalidate();
		},
	});

	const refreshMutation = useMutation({
		mutationFn: () => refreshSpecProposalPrFn({ data: { id: initial.id } }),
		onSuccess: async () => {
			await router.invalidate();
		},
	});

	const canEdit = initial.status === "draft" || initial.status === "failed";

	return (
		<div className="flex flex-col gap-6">
			<header className="space-y-2">
				<div className="flex flex-wrap items-center gap-2">
					<h1 className="text-2xl font-semibold">{initial.title}</h1>
					<Badge variant="outline">{initial.status}</Badge>
				</div>
				{initial.summary ? (
					<p className="text-muted-foreground text-sm">{initial.summary}</p>
				) : null}
				{initial.prUrl ? (
					<a
						href={initial.prUrl}
						target="_blank"
						rel="noreferrer"
						className="text-primary text-sm font-medium hover:underline"
					>
						Pull request #{initial.prNumber}
					</a>
				) : null}
			</header>

			<div className="flex flex-wrap gap-2">
				{canEdit ? (
					<>
						<Button
							type="button"
							variant="secondary"
							disabled={validateMutation.isPending}
							onClick={() => validateMutation.mutate()}
						>
							Validate
						</Button>
						<Button
							type="button"
							disabled={submitMutation.isPending || !validation?.ok}
							onClick={() => submitMutation.mutate()}
						>
							Submit PR
						</Button>
						<Button type="button" variant="outline" asChild>
							<Link
								to="/docs/proposals/$id/changes/new"
								params={{ id: initial.id }}
							>
								Add change
							</Link>
						</Button>
					</>
				) : null}
				{initial.prNumber ? (
					<Button
						type="button"
						variant="outline"
						disabled={refreshMutation.isPending}
						onClick={() => refreshMutation.mutate()}
					>
						Refresh PR status
					</Button>
				) : null}
			</div>

			{validateMutation.data || validation ? (
				<ValidationPanel result={validateMutation.data ?? validation!} />
			) : null}

			<section className="space-y-3">
				<h2 className="text-lg font-medium">Document changes</h2>
				{initial.changes.length === 0 ? (
					<p className="text-muted-foreground text-sm">No changes in this proposal yet.</p>
				) : (
					<ul className="divide-y rounded-lg border">
						{initial.changes.map((change) => (
							<li
								key={change.id}
								className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
							>
								<div>
									<p className="font-medium">{change.slug}</p>
									<p className="text-muted-foreground font-mono text-xs">
										{change.changeKind} · {change.specLevel}
									</p>
								</div>
								{canEdit ? (
									<div className="flex gap-2">
										<Button type="button" variant="outline" size="sm" asChild>
											<Link
												to="/docs/proposals/$id/changes/$changeId"
												params={{ id: initial.id, changeId: change.id }}
											>
												Edit
											</Link>
										</Button>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={async () => {
												await deleteSpecProposalChangeFn({
													data: { changeId: change.id },
												});
												await router.invalidate();
											}}
										>
											Remove
										</Button>
									</div>
								) : null}
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}

function ValidationPanel({ result }: { result: ProposalValidationResult }) {
	return (
		<div
			className={
				result.ok
					? "rounded-lg border border-green-600/30 bg-green-500/5 p-4"
					: "rounded-lg border border-destructive/30 bg-destructive/5 p-4"
			}
		>
			<p className="text-sm font-medium">
				Validation {result.ok ? "passed" : "failed"} · {result.issues.length} issue
				{result.issues.length === 1 ? "" : "s"}
			</p>
			{result.issues.length > 0 ? (
				<ul className="mt-2 max-h-48 space-y-1 overflow-auto text-xs">
					{result.issues.map((issue, i) => (
						<li key={`${issue.code}-${issue.file}-${i}`}>
							<span className="font-mono">{issue.code}</span> [{issue.source}]{" "}
							{issue.file ? `${issue.file}: ` : ""}
							{issue.message}
						</li>
					))}
				</ul>
			) : null}
		</div>
	);
}
