"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { FolderOpen } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { SyncRunLogPanel } from "#/components/sync-run-log-panel";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import type { SyncLogLine, SyncRunRecord } from "#/lib/sync/sync-run-types";
import { cn } from "#/lib/utils";
import { getSyncRunProgressFn, importSeedBundleFn } from "#/server/sync";

interface SeedImportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onComplete: () => void;
}

function mergeLogLines(
	prev: SyncLogLine[],
	incoming: SyncLogLine[],
): SyncLogLine[] {
	if (incoming.length === 0) return prev;
	const seen = new Set(prev.map((line) => line.id));
	const next = [...prev];
	for (const line of incoming) {
		if (!seen.has(line.id)) {
			seen.add(line.id);
			next.push(line);
		}
	}
	return next;
}

export function SeedImportDialog({
	open,
	onOpenChange,
	onComplete,
}: SeedImportDialogProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const lastLogIdRef = useRef(0);
	const [pickedCount, setPickedCount] = useState(0);
	const [statusMessage, setStatusMessage] = useState<string | null>(null);
	const [files, setFiles] = useState<
		Array<{ relativePath: string; content: string }>
	>([]);
	const [trackedRunId, setTrackedRunId] = useState<string | null>(null);
	const [importLogs, setImportLogs] = useState<SyncLogLine[]>([]);
	const [importRun, setImportRun] = useState<SyncRunRecord | null>(null);

	const resetImportProgress = useCallback(() => {
		lastLogIdRef.current = 0;
		setTrackedRunId(null);
		setImportLogs([]);
		setImportRun(null);
	}, []);

	const mutation = useMutation({
		mutationFn: (payload: {
			files: Array<{ relativePath: string; content: string }>;
			dryRun: boolean;
		}) => importSeedBundleFn({ data: payload }),
		onMutate: () => {
			resetImportProgress();
			setStatusMessage(null);
		},
		onSuccess: (result) => {
			setTrackedRunId(result.runId);
			const tagSummary =
				result.tagsPlanned > 0
					? ` · ${result.tagsPlanned} tag(s) planned`
					: result.tagsCreated > 0
						? ` · ${result.tagsCreated} tag(s) created`
						: "";
			setStatusMessage(
				`Done: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped${tagSummary}` +
					(result.errors.length > 0
						? ` · ${result.errors.length} issue error(s)`
						: "") +
					(result.tagErrors.length > 0
						? ` · ${result.tagErrors.length} tag error(s)`
						: ""),
			);
			onComplete();
		},
		onError: (error) => {
			setStatusMessage(
				error instanceof Error ? error.message : "Import failed",
			);
		},
	});

	const importing = mutation.isPending;

	const progressQuery = useQuery({
		queryKey: ["import-run-progress", trackedRunId, importing],
		queryFn: () =>
			getSyncRunProgressFn({
				data: {
					runId: trackedRunId ?? undefined,
					afterLogId: lastLogIdRef.current,
				},
			}),
		enabled: open && (importing || Boolean(trackedRunId)),
		refetchInterval: importing ? 500 : false,
	});

	useEffect(() => {
		const payload = progressQuery.data;
		if (!payload) return;

		if (payload.run) {
			setImportRun(payload.run);
			if (!trackedRunId && payload.run.kind === "import") {
				setTrackedRunId(payload.run.id);
			}
		}

		if (payload.logs.length > 0) {
			setImportLogs((prev) => mergeLogLines(prev, payload.logs));
			const maxId = Math.max(...payload.logs.map((line) => line.id));
			if (maxId > lastLogIdRef.current) {
				lastLogIdRef.current = maxId;
			}
		}
	}, [progressQuery.data, trackedRunId]);

	useEffect(() => {
		if (!open) {
			resetImportProgress();
			setStatusMessage(null);
			setPickedCount(0);
			setFiles([]);
		}
	}, [open, resetImportProgress]);

	const readDirectory = async (fileList: FileList) => {
		const jsonFiles = [...fileList].filter(
			(f) => f.name.endsWith(".json") && f.size < 512_000,
		);
		if (jsonFiles.length === 0) {
			setStatusMessage("No .json files found in the selected folder.");
			return;
		}

		const loaded: Array<{ relativePath: string; content: string }> = [];
		for (const file of jsonFiles) {
			const relativePath =
				(file as File & { webkitRelativePath?: string }).webkitRelativePath ||
				file.name;
			const content = await file.text();
			loaded.push({ relativePath, content });
		}

		setFiles(loaded);
		setPickedCount(loaded.length);
		resetImportProgress();
		setStatusMessage(
			`Loaded ${loaded.length} JSON file(s). Run dry-run to validate, then import (DB first, GitHub issues, then release tags).`,
		);
	};

	const showLogPanel = importing || importLogs.length > 0 || Boolean(importRun);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[min(90vh,40rem)] flex-col gap-4 overflow-hidden sm:max-w-xl">
				<DialogHeader className="shrink-0">
					<DialogTitle>Import seed data</DialogTitle>
					<DialogDescription>
						Select a directory like <code className="text-xs">data/</code> with{" "}
						<code className="text-xs">v0.x/version.json</code>,{" "}
						<code className="text-xs">tasks/*.json</code>, and related entities.
						Tasks are written to the local cache first, then pushed to GitHub.
						Released versions with a beskid cutoff commit get superrepo tags (
						<code className="text-xs">v0.1</code>,{" "}
						<code className="text-xs">v0.2</code>, …) in ascending order after
						the issue push. Webhook sync (when configured) keeps the mirror up
						to date.
					</DialogDescription>
				</DialogHeader>

				<input
					ref={inputRef}
					type="file"
					className="sr-only"
					// @ts-expect-error webkitdirectory is supported in Chromium
					webkitdirectory=""
					multiple
					onChange={(e) => {
						if (e.target.files?.length) void readDirectory(e.target.files);
						e.target.value = "";
					}}
				/>

				<div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
					<Button
						type="button"
						variant="outline"
						className="w-full justify-start"
						disabled={importing}
						onClick={() => inputRef.current?.click()}
					>
						<FolderOpen className="size-4" />
						Choose folder…
					</Button>

					{pickedCount > 0 ? (
						<p className="text-muted-foreground text-sm">
							{pickedCount} JSON files ready.
						</p>
					) : null}

					{showLogPanel ? (
						<SyncRunLogPanel
							run={importRun}
							logs={importLogs}
							followTail={importing}
							logClassName="h-52"
							emptyMessage={
								importing ? "Starting import…" : "No log lines for this run."
							}
						/>
					) : null}

					{statusMessage ? (
						<output
							className={cn(
								"text-sm leading-relaxed",
								mutation.isError && "text-destructive",
							)}
						>
							{statusMessage}
						</output>
					) : null}
				</div>

				<div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border/60 pt-3 sm:flex-row sm:justify-end">
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={importing}
					>
						Close
					</Button>
					<Button
						type="button"
						variant="secondary"
						disabled={files.length === 0 || importing}
						onClick={() => mutation.mutate({ files, dryRun: true })}
					>
						{importing && mutation.variables?.dryRun
							? "Validating…"
							: "Dry run"}
					</Button>
					<Button
						type="button"
						disabled={files.length === 0 || importing}
						onClick={() => mutation.mutate({ files, dryRun: false })}
					>
						{importing && !mutation.variables?.dryRun
							? "Importing…"
							: "Import to GitHub"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
