"use client";

import { useEffect, useRef } from "react";

import { Progress } from "#/components/ui/progress";
import { ScrollArea } from "#/components/ui/scroll-area";
import type { SyncLogLine, SyncRunRecord } from "#/lib/sync/sync-run-types";
import { cn } from "#/lib/utils";

export interface SyncRunLogPanelProps {
	run: SyncRunRecord | null;
	logs: SyncLogLine[];
	/** Pin scroll to latest lines while importing. */
	followTail?: boolean;
	className?: string;
	logClassName?: string;
	emptyMessage?: string;
}

export function SyncRunLogPanel({
	run,
	logs,
	followTail = false,
	className,
	logClassName,
	emptyMessage = "Waiting for log output…",
}: SyncRunLogPanelProps) {
	const tailRef = useRef<HTMLLIElement>(null);

	const progressPct =
		run && run.progressTotal > 0
			? Math.round((run.progressCurrent / run.progressTotal) * 100)
			: null;

	useEffect(() => {
		if (followTail && tailRef.current) {
			tailRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
		}
	}, [followTail, logs.length, run?.phase, run?.progressCurrent]);

	return (
		<div className={cn("space-y-2", className)}>
			{run ? (
				<div className="space-y-2 rounded-md border border-border/50 bg-muted/20 p-2.5">
					<div className="flex items-center justify-between gap-2 text-xs">
						<span className="font-medium capitalize">{run.kind}</span>
						<span
							className={cn(
								"text-muted-foreground truncate",
								run.status === "failed" && "text-destructive",
								run.status === "success" && "text-foreground",
							)}
						>
							{run.phase ?? run.status}
						</span>
					</div>
					{progressPct !== null ? (
						<Progress value={progressPct} className="h-1.5" />
					) : null}
					{run.progressTotal > 0 ? (
						<p className="text-muted-foreground text-[10px]">
							{run.progressCurrent} / {run.progressTotal}
						</p>
					) : null}
					{run.error ? (
						<p className="text-destructive text-xs" role="alert">
							{run.error}
						</p>
					) : null}
					{run.summary && run.status !== "running" ? (
						<p className="text-foreground text-xs">{run.summary}</p>
					) : null}
				</div>
			) : null}

			<ScrollArea
				className={cn(
					"h-44 rounded-md border border-border/40 bg-background/60",
					logClassName,
				)}
			>
				<ul className="space-y-0.5 p-2 font-mono text-[10px] leading-relaxed">
					{logs.map((line) => (
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
					{logs.length === 0 ? (
						<li className="text-muted-foreground">{emptyMessage}</li>
					) : null}
					<li ref={tailRef} aria-hidden className="h-px" />
				</ul>
			</ScrollArea>
		</div>
	);
}
