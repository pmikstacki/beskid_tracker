"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { SpecRelationEditor } from "#/components/spec-relation-editor";
import { TrackerReportForm } from "#/components/tracker-report-form";
import { Button } from "#/components/ui/button";
import { Label } from "#/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "#/components/ui/sheet";
import { Input } from "#/components/ui/input";
import type { RoadmapColumnId } from "#/lib/github/roadmap-labels";
import { ROADMAP_COLUMNS } from "#/lib/github/roadmap-labels";
import type { SpecRelation } from "#/lib/platform-spec/relations";
import { createBoardIssue } from "#/server/roadmap";

interface CreateTaskSheetProps {
	version: string;
	workstreamOptions?: string[];
}

export function CreateIssueSheet({
	version,
	workstreamOptions = [],
}: CreateTaskSheetProps) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
	const [statusColumn, setStatusColumn] = useState<RoadmapColumnId>("Backlog");
	const [workstream, setWorkstream] = useState<string | undefined>();
	const [customWorkstream, setCustomWorkstream] = useState("");
	const [specRelations, setSpecRelations] = useState<SpecRelation[]>([]);

	const hasRequiredRelation = specRelations.some((r) => r.required);
	const specReady = specRelations.length > 0 && hasRequiredRelation;

	const mutation = useMutation({
		mutationFn: (payload: {
			title: string;
			body: string;
			componentId: string;
			subcomponentId: string;
		}) =>
			createBoardIssue({
				data: {
					title: payload.title,
					body: payload.body,
					priority,
					statusColumn,
					version,
					workstream:
						workstream === "__custom__"
							? slugifyWorkstream(customWorkstream)
							: workstream,
					specRelations,
					componentId: payload.componentId,
					subcomponentId: payload.subcomponentId,
				},
			}),
		onSuccess: async () => {
			setOpen(false);
			resetMeta();
			await router.invalidate();
		},
	});

	const resetMeta = () => {
		setPriority("medium");
		setStatusColumn("Backlog");
		setWorkstream(undefined);
		setCustomWorkstream("");
		setSpecRelations([]);
	};

	const roadmapFooter = (
		<div className="flex flex-col gap-2.5 border-t border-border/60 pt-3">
			<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
				<div className="space-y-1">
					<Label className="text-xs">Status</Label>
					<Select
						value={statusColumn}
						onValueChange={(v) => setStatusColumn(v as RoadmapColumnId)}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{ROADMAP_COLUMNS.map((col) => (
								<SelectItem key={col.id} value={col.id}>
									{col.id}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-1">
					<Label className="text-xs">Priority</Label>
					<Select
						value={priority}
						onValueChange={(v) => setPriority(v as "high" | "medium" | "low")}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="high">High</SelectItem>
							<SelectItem value="medium">Medium</SelectItem>
							<SelectItem value="low">Low</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-1 sm:col-span-1">
					<Label className="text-xs">Workstream</Label>
					<Select
						value={workstream ?? "__none__"}
						onValueChange={(v) =>
							setWorkstream(v === "__none__" ? undefined : v)
						}
					>
						<SelectTrigger className="h-8">
							<SelectValue placeholder="Optional" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="__none__">None</SelectItem>
							{workstreamOptions.map((ws) => (
								<SelectItem key={ws} value={ws}>
									{ws}
								</SelectItem>
							))}
							<SelectItem value="__custom__">New workstream…</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>
			{workstream === "__custom__" ? (
				<Input
					className="h-8"
					value={customWorkstream}
					onChange={(e) => setCustomWorkstream(e.target.value)}
					placeholder="e.g. compiler-pipeline"
				/>
			) : null}
			<SpecRelationEditor
				relations={specRelations}
				onChange={setSpecRelations}
			/>
			{specRelations.length > 0 && !hasRequiredRelation ? (
				<p className="text-muted-foreground text-xs">
					Mark at least one spec relation as required.
				</p>
			) : null}
		</div>
	);

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button>New task</Button>
			</SheetTrigger>
			<SheetContent className="work-item-dialog issue-sheet w-full max-w-3xl overflow-y-auto sm:max-w-3xl">
				<SheetHeader>
					<SheetTitle>Create roadmap task</SheetTitle>
					<SheetDescription>
						Tasks are GitHub issues labeled for version{" "}
						<span className="font-mono">{version}</span>, workstream, and spec
						relations. Fields depend on the component you select.
					</SheetDescription>
				</SheetHeader>
				<div className="px-4 pb-4">
					<TrackerReportForm
						kind="task"
						pending={mutation.isPending}
						submitDisabled={!specReady}
						footer={roadmapFooter}
						submitLabel={
							mutation.isPending ? "Creating…" : "Create task on GitHub"
						}
						errorMessage={
							mutation.isError
								? mutation.error instanceof Error
									? mutation.error.message
									: "Could not create the task."
								: null
						}
						onSubmit={(payload) => mutation.mutate(payload)}
						onCancel={() => setOpen(false)}
					/>
				</div>
			</SheetContent>
		</Sheet>
	);
}

function slugifyWorkstream(value: string): string | undefined {
	const slug = value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return slug || undefined;
}
