"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Upload } from "lucide-react";
import { useState } from "react";

import { SeedImportDialog } from "#/components/seed-import-dialog";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Progress } from "#/components/ui/progress";
import { ScrollArea } from "#/components/ui/scroll-area";
import type { SyncStatusPayload } from "#/lib/sync/sync-run-types";
import { cn } from "#/lib/utils";
import { getBoardSyncStatusFn, triggerBoardSyncFn } from "#/server/sync";

function SyncModeBadge({
	mode,
	className,
}: {
	mode: SyncStatusPayload["syncMode"] | undefined;
	className?: string;
}) {
	if (mode === "webhook") {
		return (
			<Badge variant="secondary" className={cn("text-[10px]", className)}>
				Webhook
			</Badge>
		);
	}
	if (mode === "unconfigured") {
		return (
			<Badge variant="outline" className={cn("text-[10px]", className)}>
				Setup needed
			</Badge>
		);
	}
	return (
		<Badge variant="outline" className={cn("text-[10px]", className)}>
			Off
		</Badge>
	);
}

interface BoardSyncPanelProps {
	canManage: boolean;
	/** Drawer layout — omit outer card chrome. */
	embedded?: boolean;
}

export function BoardSyncPanel({
	canManage,
	embedded = false,
}: BoardSyncPanelProps) {
	const queryClient = useQueryClient();
	const [importOpen, setImportOpen] = useState(false);

	const statusQuery = useQuery({
		queryKey: ["board-sync-status"],
		queryFn: () => getBoardSyncStatusFn(),
		refetchInterval: (query) => {
			const active = query.state.data?.activeRun;
			return active ? 1500 : 8000;
		},
	});

	const syncMutation = useMutation({
		mutationFn: () => triggerBoardSyncFn(),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["board-sync-status"] });
			void queryClient.invalidateQueries();
		},
	});

	const payload = statusQuery.data;
	const active = payload?.activeRun;
	const progressPct =
		active && active.progressTotal > 0
			? Math.round((active.progressCurrent / active.progressTotal) * 100)
			: null;

	return (
		<div
			className={cn(
				"space-y-3",
				!embedded && "rounded-lg border border-border/60 bg-muted/10 p-3",
			)}
		>
			{embedded ? (
				<div className="flex items-center justify-end">
					<SyncModeBadge mode={payload?.syncMode} />
				</div>
			) : (
				<div className="flex items-start justify-between gap-2">
					<div>
						<p className="text-sm font-medium">GitHub sync</p>
						<p className="text-muted-foreground text-xs leading-relaxed">
							GitHub is the source of truth. Ongoing updates use webhooks;
							bootstrap with Sync now when the cache is empty.
						</p>
					</div>
					<SyncModeBadge mode={payload?.syncMode} className="shrink-0" />
				</div>
			)}

			{embedded ? (
				<p className="text-muted-foreground text-xs leading-relaxed">
					Ongoing updates use webhooks. Configure them on the Settings tab.
				</p>
			) : null}

			{payload?.syncMode === "unconfigured" ? (
				<output className="text-amber-700 text-xs dark:text-amber-400">
					Webhook secret is not configured. Open Settings to finish setup.
				</output>
			) : null}

			{payload?.state.lastSuccessAt ? (
				<p className="text-muted-foreground text-xs">
					Last sync{" "}
					<time dateTime={payload.state.lastSuccessAt}>
						{new Date(payload.state.lastSuccessAt).toLocaleString()}
					</time>
					{" · "}
					{payload.state.openIssueCount} open
				</p>
			) : (
				<p className="text-muted-foreground text-xs">No successful sync yet.</p>
			)}

			{payload?.state.lastError ? (
				<p className="text-destructive text-xs" role="alert">
					{payload.state.lastError}
				</p>
			) : null}

			{active ? (
				<div className="space-y-2 rounded-md border border-border/50 bg-background/80 p-2.5">
					<div className="flex items-center justify-between gap-2 text-xs">
						<span className="font-medium capitalize">{active.kind} sync</span>
						<span className="text-muted-foreground">{active.phase ?? "…"}</span>
					</div>
					{progressPct !== null ? (
						<Progress value={progressPct} className="h-1.5" />
					) : null}
					{active.progressTotal > 0 ? (
						<p className="text-muted-foreground text-[10px]">
							{active.progressCurrent} / {active.progressTotal}
						</p>
					) : null}
				</div>
			) : null}

			<ScrollArea
				className={cn(
					"rounded-md border border-border/40 bg-background/60",
					embedded ? "h-48" : "h-36",
				)}
			>
				<ul className="space-y-0.5 p-2 font-mono text-[10px] leading-relaxed">
					{(payload?.logs ?? []).map((line) => (
						<li
							key={line.id}
							className={cn(
								line.level === "error" && "text-destructive",
								line.level === "warn" && "text-amber-600 dark:text-amber-400",
								line.level === "info" && "text-muted-foreground",
							)}
						>
							<span className="opacity-60">
								{new Date(line.createdAt).toLocaleTimeString()}{" "}
							</span>
							{line.message}
						</li>
					))}
					{(payload?.logs ?? []).length === 0 ? (
						<li className="text-muted-foreground">No log lines yet.</li>
					) : null}
				</ul>
			</ScrollArea>

			<div className="flex flex-wrap gap-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="h-8"
					disabled={Boolean(active) || syncMutation.isPending}
					onClick={() => syncMutation.mutate()}
				>
					<RefreshCw
						className={cn(
							"size-3.5",
							(syncMutation.isPending || active) && "animate-spin",
						)}
					/>
					Bootstrap sync
				</Button>
				{canManage ? (
					<Button
						type="button"
						variant="secondary"
						size="sm"
						className="h-8"
						disabled={Boolean(active)}
						onClick={() => setImportOpen(true)}
					>
						<Upload className="size-3.5" />
						Import seed…
					</Button>
				) : null}
			</div>

			{canManage ? (
				<SeedImportDialog
					open={importOpen}
					onOpenChange={setImportOpen}
					onComplete={() => {
						void queryClient.invalidateQueries({
							queryKey: ["board-sync-status"],
						});
						void queryClient.invalidateQueries();
					}}
				/>
			) : null}
		</div>
	);
}
