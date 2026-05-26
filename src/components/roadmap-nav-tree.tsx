"use client";

import { Link } from "@tanstack/react-router";
import { ChevronRight, Flag, KanbanSquare, LayoutGrid } from "lucide-react";

import { RoadmapVersionSwitcher } from "#/components/roadmap-version-switcher";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "#/components/ui/collapsible";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "#/components/ui/sidebar";
import type { RoadmapCatalogVersion } from "#/lib/roadmap/types";
import type { AuthUser } from "#/lib/github/types";

interface RoadmapNavTreeProps {
	version: RoadmapCatalogVersion;
	versions: RoadmapCatalogVersion[];
	user: AuthUser | null;
	pathname: string;
}

const SIGN_IN_TOOLTIP = "Sign in to view";

export function RoadmapNavTree({
	version,
	versions,
	user,
	pathname,
}: RoadmapNavTreeProps) {
	const signedIn = Boolean(user);
	const versionPrefix = `/versions/${version.id}`;
	const onVersionDash = pathname === versionPrefix;
	const deliverableOpen =
		pathname.includes(`${versionPrefix}/deliverables/`) ||
		pathname.includes(`${versionPrefix}/milestones/`);
	const workstreamOpen = pathname.includes(`${versionPrefix}/workstreams/`);

	return (
		<SidebarGroup className="group-data-[collapsible=icon]:hidden">
			<SidebarGroupContent>
				<RoadmapVersionSwitcher
					versions={versions}
					currentId={version.id}
					variant="header"
				/>
				<SidebarMenu className="mt-1">
					<SidebarMenuItem>
						{signedIn ? (
							<SidebarMenuButton
								asChild
								isActive={onVersionDash}
								tooltip="Overview"
							>
								<Link to="/versions/$version" params={{ version: version.id }}>
									<LayoutGrid />
									<span>Version overview</span>
								</Link>
							</SidebarMenuButton>
						) : (
							<SidebarMenuButton disabled tooltip={SIGN_IN_TOOLTIP}>
								<LayoutGrid />
								<span>Version overview</span>
							</SidebarMenuButton>
						)}
					</SidebarMenuItem>

					{signedIn ? (
						<SidebarMenuItem>
							<SidebarMenuButton
								asChild
								isActive={pathname === `/v/${version.id}`}
								tooltip="Kanban board"
							>
								<Link to="/v/$version" params={{ version: version.id }}>
									<KanbanSquare />
									<span>Board</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					) : null}

					{signedIn ? (
						<Collapsible
							asChild
							defaultOpen={deliverableOpen || onVersionDash}
							className="group/collapsible"
						>
							<SidebarMenuItem>
								<CollapsibleTrigger asChild>
									<SidebarMenuButton tooltip="Deliverables">
										<Flag />
										<span>Deliverables</span>
										<ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
									</SidebarMenuButton>
								</CollapsibleTrigger>
								<CollapsibleContent>
									<SidebarMenuSub>
										{version.deliverables.map((deliverable) => (
											<SidebarMenuSubItem key={deliverable.id}>
												<SidebarMenuSubButton
													asChild
													isActive={
														pathname ===
															`${versionPrefix}/deliverables/${deliverable.id}` ||
														pathname ===
															`${versionPrefix}/milestones/${deliverable.id}`
													}
												>
													<Link
														to="/versions/$version/deliverables/$deliverableId"
														params={{
															version: version.id,
															deliverableId: deliverable.id,
														}}
													>
														<span className="truncate">
															{deliverable.title}
														</span>
													</Link>
												</SidebarMenuSubButton>
											</SidebarMenuSubItem>
										))}
									</SidebarMenuSub>
								</CollapsibleContent>
							</SidebarMenuItem>
						</Collapsible>
					) : (
						<SidebarMenuItem>
							<SidebarMenuButton disabled tooltip={SIGN_IN_TOOLTIP}>
								<Flag />
								<span>Deliverables</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					)}

					{signedIn ? (
						<Collapsible
							asChild
							defaultOpen={workstreamOpen}
							className="group/collapsible"
						>
							<SidebarMenuItem>
								<CollapsibleTrigger asChild>
									<SidebarMenuButton tooltip="Workstreams">
										<LayoutGrid />
										<span>Workstreams</span>
										<ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
									</SidebarMenuButton>
								</CollapsibleTrigger>
								<CollapsibleContent>
									<SidebarMenuSub>
										{version.workstreams.map((ws) => (
											<SidebarMenuSubItem key={ws.slug}>
												<SidebarMenuSubButton
													asChild
													isActive={
														pathname ===
														`${versionPrefix}/workstreams/${ws.slug}`
													}
												>
													<Link
														to="/versions/$version/workstreams/$slug"
														params={{
															version: version.id,
															slug: ws.slug,
														}}
													>
														<span className="truncate">{ws.title}</span>
													</Link>
												</SidebarMenuSubButton>
											</SidebarMenuSubItem>
										))}
									</SidebarMenuSub>
								</CollapsibleContent>
							</SidebarMenuItem>
						</Collapsible>
					) : (
						<SidebarMenuItem>
							<SidebarMenuButton disabled tooltip={SIGN_IN_TOOLTIP}>
								<LayoutGrid />
								<span>Workstreams</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					)}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}
