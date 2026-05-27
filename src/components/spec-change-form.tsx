"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { ReportFormLayoutView } from "#/components/report-form-layout";
import { Button } from "#/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import {
	formValuesToFrontmatter,
	frontmatterToFormValues,
	resolveSpecFormLayout,
} from "#/lib/docs-spec/form-layouts";
import { parseFrontmatterJson } from "#/lib/docs-spec/frontmatter";
import type { SpecLevel, SpecProposalChangeKind } from "#/lib/docs-spec/types";
import { upsertSpecProposalChangeFn } from "#/server/spec-proposals";

export interface SpecChangeFormProps {
	proposalId: string;
	changeId?: string;
	initial?: {
		changeKind: SpecProposalChangeKind;
		specLevel: SpecLevel;
		frontmatterJson: string;
		bodyMd: string;
	};
	defaultOwner?: { name: string; email: string };
}

export function SpecChangeForm({
	proposalId,
	changeId,
	initial,
	defaultOwner,
}: SpecChangeFormProps) {
	const router = useRouter();
	const [changeKind, setChangeKind] = useState<SpecProposalChangeKind>(
		initial?.changeKind ?? "update",
	);
	const [specLevel, setSpecLevel] = useState<SpecLevel>(
		initial?.specLevel ?? "article",
	);

	const initialValues = useMemo(() => {
		const fm = parseFrontmatterJson(initial?.frontmatterJson ?? "{}");
		const values = frontmatterToFormValues(fm, initial?.bodyMd ?? "");
		if (defaultOwner && !values.owner_name) {
			values.owner_name = defaultOwner.name;
			values.owner_email = defaultOwner.email;
			values.submitter_name = defaultOwner.name;
			values.submitter_email = defaultOwner.email;
		}
		return values;
	}, [initial, defaultOwner]);

	const [values, setValues] = useState<Record<string, string>>(initialValues);

	const layout = useMemo(
		() => resolveSpecFormLayout(specLevel, changeKind),
		[specLevel, changeKind],
	);

	const mutation = useMutation({
		mutationFn: () =>
			upsertSpecProposalChangeFn({
				data: {
					proposalId,
					changeId,
					changeKind,
					specLevel,
					values,
				},
			}),
		onSuccess: async () => {
			await router.navigate({
				to: "/docs/proposals/$id",
				params: { id: proposalId },
			});
		},
	});

	const previewFm = formValuesToFrontmatter(specLevel, values);

	return (
		<div className="flex flex-col gap-6">
			{!changeId ? (
				<div className="flex flex-wrap gap-4">
					<div className="space-y-1">
						<p className="text-sm font-medium">Change kind</p>
						<Select
							value={changeKind}
							onValueChange={(v) => setChangeKind(v as SpecProposalChangeKind)}
						>
							<SelectTrigger className="w-40">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="create">Create</SelectItem>
								<SelectItem value="update">Update</SelectItem>
								<SelectItem value="delete">Delete</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-1">
						<p className="text-sm font-medium">Document type</p>
						<Select
							value={specLevel}
							onValueChange={(v) => setSpecLevel(v as SpecLevel)}
						>
							<SelectTrigger className="w-40">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="domain">Domain</SelectItem>
								<SelectItem value="area">Area</SelectItem>
								<SelectItem value="feature">Feature</SelectItem>
								<SelectItem value="article">Article</SelectItem>
								<SelectItem value="adr">ADR</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			) : null}

			<ReportFormLayoutView
				layout={layout}
				values={values}
				attachments={{}}
				pending={mutation.isPending}
				onValueChange={(id, next) =>
					setValues((prev) => ({ ...prev, [id]: next }))
				}
				onAttachmentsChange={() => {}}
			/>

			{mutation.error ? (
				<p className="text-destructive text-sm">{String(mutation.error)}</p>
			) : null}

			<div className="flex gap-2">
				<Button
					type="button"
					onClick={() => mutation.mutate()}
					disabled={mutation.isPending}
				>
					Save change
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={() =>
						router.navigate({
							to: "/docs/proposals/$id",
							params: { id: proposalId },
						})
					}
				>
					Cancel
				</Button>
			</div>

			<details className="text-muted-foreground text-xs">
				<summary className="cursor-pointer">Frontmatter preview</summary>
				<pre className="mt-2 overflow-auto rounded-md border p-3 font-mono">
					{JSON.stringify(previewFm, null, 2)}
				</pre>
			</details>
		</div>
	);
}
