"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, RefreshCw } from "lucide-react";

import { BoardSyncPanel } from "#/components/board-sync-panel";
import { GithubWebhookSettingsPanel } from "#/components/github-webhook-settings-panel";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { cn } from "#/lib/utils";
import { getBoardSyncStatusFn } from "#/server/sync";

interface BoardSyncDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	canManage: boolean;
}

export function BoardSyncHeaderButton({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const statusQuery = useQuery({
		queryKey: ["board-sync-status"],
		queryFn: () => getBoardSyncStatusFn(),
		refetchInterval: (query) => {
			const active = query.state.data?.activeRun;
			return active ? 1500 : 8000;
		},
	});

	const active = statusQuery.data?.activeRun;
	const hasError = Boolean(statusQuery.data?.state.lastError);
	const needsWebhook = statusQuery.data?.syncMode === "unconfigured";

	return (
		<Button
			type="button"
			variant={open ? "secondary" : "ghost"}
			size="icon-sm"
			className="relative shrink-0"
			onClick={() => onOpenChange(!open)}
			aria-expanded={open}
			aria-controls="board-sync-drawer"
			title="GitHub sync"
		>
			<RefreshCw
				className={cn(
					"size-4",
					(active || statusQuery.isFetching) && "animate-spin",
				)}
				aria-hidden
			/>
			<span className="sr-only">GitHub sync</span>
			{hasError && !open ? (
				<span
					className="bg-destructive absolute top-1 right-1 size-1.5 rounded-full"
					aria-hidden
				/>
			) : null}
			{needsWebhook && !open && !hasError ? (
				<span
					className="bg-amber-500 absolute top-1 right-1 size-1.5 rounded-full"
					aria-hidden
				/>
			) : null}
		</Button>
	);
}

export function BoardSyncDrawer({
	open,
	onOpenChange,
	canManage,
}: BoardSyncDrawerProps) {
	return (
		<aside
			id="board-sync-drawer"
			className="board-sync-drawer"
			data-expanded={open ? "true" : "false"}
			aria-label="GitHub sync"
			aria-hidden={!open}
		>
			<div className="board-sync-drawer__panel" hidden={!open}>
				<header className="board-sync-drawer__header">
					<div>
						<h2 className="text-sm font-semibold">GitHub sync</h2>
						<p className="text-muted-foreground mt-0.5 text-xs">
							Webhook cache, bootstrap, and seed import
						</p>
					</div>
					<div className="flex items-center gap-1">
						<Badge variant="outline" className="text-[10px] font-normal">
							Master: GitHub
						</Badge>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							onClick={() => onOpenChange(false)}
							aria-label="Close sync panel"
						>
							<ChevronLeft className="size-4" />
						</Button>
					</div>
				</header>
				<div className="board-sync-drawer__body">
					{canManage ? (
						<Tabs defaultValue="sync" className="gap-3">
							<TabsList className="w-full">
								<TabsTrigger value="sync" className="flex-1">
									Sync
								</TabsTrigger>
								<TabsTrigger value="settings" className="flex-1">
									Settings
								</TabsTrigger>
							</TabsList>
							<TabsContent value="sync" className="mt-0">
								<BoardSyncPanel canManage embedded />
							</TabsContent>
							<TabsContent value="settings" className="mt-0">
								<GithubWebhookSettingsPanel />
							</TabsContent>
						</Tabs>
					) : (
						<BoardSyncPanel canManage={false} embedded />
					)}
				</div>
			</div>
		</aside>
	);
}
