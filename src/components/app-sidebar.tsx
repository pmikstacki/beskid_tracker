"use client";

import { Link, useRouterState } from "@tanstack/react-router";
import {
	Bug,
	ChevronUp,
	ExternalLink,
	FileText,
	LogOut,
	MapIcon,
} from "lucide-react";

import { ReportIssueDialog } from "#/components/report-issue-dialog";
import { RoadmapNavTree } from "#/components/roadmap-nav-tree";
import { PLATFORM_SPEC_ORIGIN } from "#/lib/beskid-docs-origin";
import { ThemeToggle } from "#/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import {
	DialogTrigger,
} from "#/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "#/components/ui/sidebar";
import { DEFAULT_DELIVERY_VERSIONS } from "#/lib/github/roadmap-labels";
import type { AuthUser } from "#/lib/github/types";
import type { RoadmapCatalogVersion } from "#/lib/roadmap/types";

interface AppSidebarProps {
	user: AuthUser | null;
	version?: string;
	versions?: RoadmapCatalogVersion[];
	/** Hide version switcher and scoped roadmap tree (global bug tracker). */
	showRoadmapNav?: boolean;
	reportBugUser?: AuthUser | null;
}

export function AppSidebar({
	user,
	version,
	versions = [],
	showRoadmapNav = true,
	reportBugUser,
}: AppSidebarProps) {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const onRoadmapHome = pathname === "/";
	const onBugs = pathname.startsWith("/bugs");
	const activeVersion =
		version ??
		(pathname.match(/\/versions\/([^/]+)/)?.[1] as string | undefined) ??
		(pathname.match(/\/v\/([^/]+)/)?.[1] as string | undefined) ??
		DEFAULT_DELIVERY_VERSIONS[1];
	const fallbackVersions: RoadmapCatalogVersion[] =
		DEFAULT_DELIVERY_VERSIONS.map((id, index) => ({
			id,
			title: `Delivery ${id}`,
			summary: "Roadmap delivery version.",
			theme: "",
			status:
				index < DEFAULT_DELIVERY_VERSIONS.length - 1
					? "Released"
					: "In Progress",
			cutoff: {
				startDate: "2026-01-01",
				endDate: "2026-12-31",
				endCommitSha: "0000000",
			},
			deliverables: [],
			workstreams: [],
			stats: {
				tasksTotal: 0,
				tasksDone: 0,
				tasksInProgress: 0,
				tasksBacklog: 0,
				deliverablesTotal: 0,
				deliverablesClosed: 0,
				workstreamsTotal: 0,
				commitsTracked: 0,
			},
		}));
	const versionList = versions.length > 0 ? versions : fallbackVersions;
	const fallbackSelectedVersion =
		fallbackVersions.at(-1) ?? fallbackVersions[0] ?? createFallbackVersion();
	const selectedVersion =
		versionList.find((item) => item.id === activeVersion) ??
		versionList.at(-1) ??
		fallbackSelectedVersion;

	function createFallbackVersion(): RoadmapCatalogVersion {
		return {
			id: DEFAULT_DELIVERY_VERSIONS[0],
			title: `Delivery ${DEFAULT_DELIVERY_VERSIONS[0]}`,
			summary: "Roadmap delivery version.",
			theme: "",
			status: "In Progress",
			cutoff: {
				startDate: "2026-01-01",
				endDate: "2026-12-31",
				endCommitSha: "0000000",
			},
			deliverables: [],
			workstreams: [],
			stats: {
				tasksTotal: 0,
				tasksDone: 0,
				tasksInProgress: 0,
				tasksBacklog: 0,
				deliverablesTotal: 0,
				deliverablesClosed: 0,
				workstreamsTotal: 0,
				commitsTracked: 0,
			},
		};
	}

	return (
		<Sidebar collapsible="icon" variant="sidebar">
			<SidebarHeader className="border-b border-sidebar-border">
				<div className="flex items-center px-2 pt-4 pb-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
					<SidebarMenu className="min-w-0 flex-1 group-data-[collapsible=icon]:flex-none">
						<SidebarMenuItem>
							<SidebarMenuButton size="lg" asChild className="mb-1">
								{user ? (
									<Link
										to="/versions/$version"
										params={{ version: selectedVersion.id }}
									>
										<img
											src="/favicon.svg"
											alt=""
											width={28}
											height={28}
											className="size-7 shrink-0 rounded-md"
										/>
										<div className="grid flex-1 text-left text-sm leading-tight">
											<span className="truncate font-semibold">Beskid</span>
											<span className="truncate text-xs text-sidebar-foreground/70">
												Tracker
											</span>
										</div>
									</Link>
								) : (
									<Link to="/">
										<img
											src="/favicon.svg"
											alt=""
											width={28}
											height={28}
											className="size-7 shrink-0 rounded-md"
										/>
										<div className="grid flex-1 text-left text-sm leading-tight">
											<span className="truncate font-semibold">Beskid</span>
											<span className="truncate text-xs text-sidebar-foreground/70">
												Tracker
											</span>
										</div>
									</Link>
								)}
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</div>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton
									asChild
									isActive={onRoadmapHome}
									tooltip="Roadmap"
								>
									<Link to="/">
										<MapIcon />
										<span>Roadmap</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild isActive={onBugs} tooltip="Bugs">
									<Link to="/bugs">
										<Bug />
										<span>Bugs</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild tooltip="Platform spec">
									<a
										href={`${PLATFORM_SPEC_ORIGIN}/platform-spec/`}
										target="_blank"
										rel="noreferrer"
									>
										<FileText />
										<span>Platform spec</span>
										<ExternalLink className="ml-auto size-3.5 opacity-60" />
									</a>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				{showRoadmapNav ? (
					<RoadmapNavTree
						version={selectedVersion}
						versions={versionList}
						user={user}
						pathname={pathname}
					/>
				) : null}

				<SidebarGroup className="group-data-[collapsible=icon]:hidden">
					<SidebarGroupLabel>Report</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<ReportIssueDialog
									user={reportBugUser ?? user}
									trigger={
										<SidebarMenuButton tooltip="Report a bug" asChild>
											<DialogTrigger>
												<Bug />
												<span>Report a bug</span>
											</DialogTrigger>
										</SidebarMenuButton>
									}
								/>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter className="border-t border-sidebar-border">
				<SidebarMenu>
					<SidebarMenuItem>
						<div className="flex items-center justify-between gap-2 px-2 py-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
							<span className="text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:sr-only">
								Theme
							</span>
							<ThemeToggle />
						</div>
					</SidebarMenuItem>
					{user ? (
						<SidebarMenuItem>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<SidebarMenuButton
										size="lg"
										className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
									>
										<Avatar className="size-8 rounded-lg">
											<AvatarImage src={user.avatarUrl} alt={user.login} />
											<AvatarFallback className="rounded-lg">
												{user.login.slice(0, 2).toUpperCase()}
											</AvatarFallback>
										</Avatar>
										<div className="grid flex-1 text-left text-sm leading-tight">
											<span className="truncate font-medium">{user.login}</span>
											<span className="truncate text-xs text-sidebar-foreground/70">
												GitHub account
											</span>
										</div>
										<ChevronUp className="ml-auto size-4" />
									</SidebarMenuButton>
								</DropdownMenuTrigger>
								<DropdownMenuContent
									className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
									side="top"
									align="end"
									sideOffset={4}
								>
									<DropdownMenuItem asChild>
										<a
											href={`https://github.com/${user.login}`}
											target="_blank"
											rel="noopener noreferrer"
										>
											<ExternalLink className="size-4" />
											GitHub profile
										</a>
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem asChild>
										<form
											action="/api/auth/logout"
											method="post"
											className="w-full"
										>
											<button
												type="submit"
												className="flex w-full cursor-pointer items-center gap-2"
											>
												<LogOut className="size-4" />
												Sign out
											</button>
										</form>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</SidebarMenuItem>
					) : (
						<SidebarMenuItem>
							<SidebarMenuButton asChild tooltip="Sign in">
								<Link to="/login">Sign in with GitHub</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					)}
				</SidebarMenu>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
