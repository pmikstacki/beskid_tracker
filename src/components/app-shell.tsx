"use client";

import { BeskidHub } from "@beskid/beskid-ui/react/BeskidHub";
import { useRouterState } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";

import { AppSidebar } from "#/components/app-sidebar";
import {
	TrackerSettingsDialog,
	TrackerSettingsHeaderButton,
} from "#/components/tracker-settings-dialog";
import { RoadmapGlobalSearch } from "#/components/roadmap-global-search";
import { ShellUiProvider, useShellUi } from "#/components/shell-versions-sync";
import { Separator } from "#/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "#/components/ui/sidebar";
import type { AuthUser } from "#/lib/github/types";
import type { RoadmapSearchHit } from "#/lib/roadmap/search-index";
import type { RoadmapCatalogVersion } from "#/lib/roadmap/types";

interface AppShellProps {
	user: AuthUser | null;
	canManageRoadmap?: boolean;
	catalogVersions: RoadmapCatalogVersion[];
	defaultVersionId: string;
	searchIndex: RoadmapSearchHit[];
	children: ReactNode;
}

function AppShellInner({
	user,
	canManageRoadmap = false,
	catalogVersions,
	defaultVersionId,
	searchIndex,
	children,
}: AppShellProps) {
	const { version: routeVersion } = useShellUi();
	const activeVersionId = routeVersion ?? defaultVersionId;
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const globalView = pathname.startsWith("/bugs");
	const [settingsOpen, setSettingsOpen] = useState(false);

	return (
		<SidebarProvider defaultOpen>
			<AppSidebar
				user={user}
				version={globalView ? undefined : activeVersionId}
				versions={catalogVersions}
				showRoadmapNav={!globalView}
				reportBugUser={user}
			/>
			<SidebarInset className="app-shell__inset flex min-h-0 flex-col">
				<header className="app-shell__header flex h-14 shrink-0 items-center border-b border-border px-4">
					<div className="flex min-w-0 items-center gap-2">
						<SidebarTrigger className="-ml-1" />
						<Separator orientation="vertical" className="mr-2 h-6" />
						<p className="island-kicker hidden shrink-0 sm:block">Beskid</p>
						<span className="text-muted-foreground hidden sm:inline">/</span>
						<span className="hidden truncate font-semibold md:inline">
							Tracker
						</span>
					</div>
					<div className="ml-auto flex min-w-0 max-w-2xl flex-1 items-center justify-end gap-2">
						<RoadmapGlobalSearch hits={searchIndex} />
						{user ? (
							<TrackerSettingsHeaderButton
								open={settingsOpen}
								onOpenChange={setSettingsOpen}
							/>
						) : null}
						<BeskidHub />
					</div>
				</header>
				<div className="app-shell__body flex min-h-0 flex-1">
					<div className="app-shell__main flex min-h-0 min-w-0 flex-1 flex-col">
						{children}
					</div>
					{user ? (
						<TrackerSettingsDialog
							open={settingsOpen}
							onOpenChange={setSettingsOpen}
							canManage={canManageRoadmap}
						/>
					) : null}
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}

export function AppShell({
	user,
	canManageRoadmap,
	catalogVersions,
	defaultVersionId,
	searchIndex,
	children,
}: AppShellProps) {
	return (
		<ShellUiProvider>
			<AppShellInner
				user={user}
				canManageRoadmap={canManageRoadmap}
				catalogVersions={catalogVersions}
				defaultVersionId={defaultVersionId}
				searchIndex={searchIndex}
			>
				{children}
			</AppShellInner>
		</ShellUiProvider>
	);
}
