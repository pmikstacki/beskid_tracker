import { createFileRoute, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";

import { BoardFilterPanel } from "#/components/board-filter-panel";
import { CreateIssueSheet } from "#/components/create-issue-sheet";
import { RoadmapKanbanBoard } from "#/components/roadmap-kanban-board";
import { ShellVersionsSync } from "#/components/shell-versions-sync";
import { filterColumnsByMetaQuery } from "#/lib/roadmap/meta-search";
import { parseMetaQuery } from "#/lib/roadmap/meta-search-query";
import { roadmapScopeRouteOptions } from "#/lib/roadmap/scope-route-options";
import { getAuthUser } from "#/server/auth";
import { getBoard } from "#/server/roadmap";

const searchSchema = z.object({
	q: z.string().optional(),
	workstream: z.string().optional(),
	domain: z.string().optional(),
	area: z.string().optional(),
	feature: z.string().optional(),
});

export interface BoardFilterState {
	q?: string;
	workstream?: string;
	domain?: string;
	area?: string;
	feature?: string;
}

export const Route = createFileRoute("/_shell/v/$version")({
	validateSearch: searchSchema,
	...roadmapScopeRouteOptions,
	beforeLoad: async () => {
		const user = await getAuthUser();
		if (!user) {
			throw redirect({ to: "/login" });
		}
		return { user };
	},
	loaderDeps: ({ search }) => search,
	loader: async ({ params, deps }) => {
		const parsed = parseMetaQuery(deps.q ?? "");
		return getBoard({
			data: {
				version: params.version,
				workstream: deps.workstream ?? parsed.workstream,
				domain: deps.domain ?? parsed.domain,
				area: deps.area ?? parsed.area,
				feature: deps.feature ?? parsed.feature,
			},
		});
	},
	component: VersionBoardPage,
});

function VersionBoardPage() {
	const { version } = Route.useParams();
	const search = Route.useSearch();
	const board = Route.useLoaderData();
	const navigate = Route.useNavigate();

	const [filters, setFilters] = useState<BoardFilterState>({
		q: search.q,
		workstream: search.workstream,
		domain: search.domain,
		area: search.area,
		feature: search.feature,
	});

	useEffect(() => {
		setFilters({
			q: search.q,
			workstream: search.workstream,
			domain: search.domain,
			area: search.area,
			feature: search.feature,
		});
	}, [search.q, search.workstream, search.domain, search.area, search.feature]);

	const syncFiltersToUrl = useCallback(
		(next: BoardFilterState) => {
			setFilters(next);
			const parsed = parseMetaQuery(next.q ?? "");
			navigate({
				search: {
					q: next.q,
					workstream: next.workstream ?? parsed.workstream,
					domain: next.domain ?? parsed.domain,
					area: next.area ?? parsed.area,
					feature: next.feature ?? parsed.feature,
				},
				replace: true,
			});
		},
		[navigate],
	);

	const filteredColumns = useMemo(
		() => filterColumnsByMetaQuery(board.columns, filters.q ?? ""),
		[board.columns, filters.q],
	);

	const totalCount = board.tasks.length;
	const resultCount = useMemo(() => {
		return Object.values(filteredColumns).reduce(
			(sum, col) => sum + col.length,
			0,
		);
	}, [filteredColumns]);

	const metaQuery = filters.q ?? "";

	return (
		<div className="board-view flex min-h-0 flex-1 flex-col">
			<ShellVersionsSync version={version} />
			<div className="board-view__stage relative flex min-h-0 flex-1">
				<div className="board-view__canvas min-h-0 min-w-0 flex-1 overflow-auto p-4 md:p-5">
					<RoadmapKanbanBoard
						columns={filteredColumns}
						canManage={board.meta.canManage}
					/>
				</div>
				<BoardFilterPanel
					query={metaQuery}
					onQueryChange={(q) => syncFiltersToUrl({ ...filters, q: q || undefined })}
					workstreams={board.meta.workstreams}
					domains={board.meta.domains}
					areas={board.meta.areas}
					features={board.meta.features}
					resultCount={resultCount}
					totalCount={totalCount}
				/>
				<div className="board-view__fab pointer-events-none absolute bottom-4 left-4 z-20 md:left-5">
					<div className="pointer-events-auto">
						<CreateIssueSheet
							version={version}
							workstreamOptions={board.meta.workstreams}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
