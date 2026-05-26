"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { IssueDetailSheet } from "#/components/issue-detail-sheet";
import {
	Kanban,
	KanbanBoard,
	KanbanColumn,
	KanbanColumnContent,
	KanbanItem,
	KanbanItemHandle,
	KanbanOverlay,
} from "#/components/reui/kanban";
import { SpecRelationsList } from "#/components/spec-relations-list";
import { Badge } from "#/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import type { RoadmapColumnId } from "#/lib/github/roadmap-labels";
import type { RoadmapColumns, RoadmapTask } from "#/lib/github/types";
import { moveIssueColumn } from "#/server/issues";

const PRIORITY_LABEL = {
	high: "High",
	medium: "Medium",
	low: "Low",
} as const;

function findColumnMove(
	prev: RoadmapColumns,
	next: RoadmapColumns,
): { issueNumber: number; targetColumn: RoadmapColumnId } | null {
	const prevColumnById = new Map<string, RoadmapColumnId>();
	for (const [columnId, items] of Object.entries(prev) as [
		RoadmapColumnId,
		RoadmapTask[],
	][]) {
		for (const item of items) {
			prevColumnById.set(item.id, columnId);
		}
	}

	for (const [columnId, items] of Object.entries(next) as [
		RoadmapColumnId,
		RoadmapTask[],
	][]) {
		for (const item of items) {
			const previous = prevColumnById.get(item.id);
			if (previous && previous !== columnId) {
				return { issueNumber: item.number, targetColumn: columnId };
			}
		}
	}
	return null;
}

interface RoadmapKanbanBoardProps {
	columns: RoadmapColumns;
	canManage?: boolean;
}

export function RoadmapKanbanBoard({
	columns: initialColumns,
	canManage = false,
}: RoadmapKanbanBoardProps) {
	const router = useRouter();
	const [columns, setColumns] = useState(initialColumns);
	const [selectedTask, setSelectedTask] = useState<RoadmapTask | null>(null);
	const [detailOpen, setDetailOpen] = useState(false);

	const tasksById = useMemo(() => {
		const map = new Map<string, RoadmapTask>();
		for (const items of Object.values(initialColumns)) {
			for (const task of items) {
				map.set(task.id, task);
			}
		}
		return map;
	}, [initialColumns]);

	useEffect(() => {
		setColumns(initialColumns);
	}, [initialColumns]);

	const moveMutation = useMutation({
		mutationFn: (input: {
			issueNumber: number;
			targetColumn: RoadmapColumnId;
		}) => moveIssueColumn({ data: input }),
		onSuccess: async () => {
			await router.invalidate();
		},
		onError: () => {
			setColumns(initialColumns);
		},
	});

	const handleColumnsChange = (next: Record<string, RoadmapTask[]>) => {
		const columnsNext = next as RoadmapColumns;
		const move = findColumnMove(columns, columnsNext);
		setColumns(columnsNext);
		if (move && !moveMutation.isPending) {
			moveMutation.mutate(move);
		}
	};

	const openTask = (taskId: string) => {
		const task = tasksById.get(taskId);
		if (!task) return;
		setSelectedTask(task);
		setDetailOpen(true);
	};

	return (
		<>
			<Kanban
				value={columns}
				onValueChange={handleColumnsChange}
				getItemValue={(item) => item.id}
				className="w-full"
			>
				<KanbanBoard className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
					{Object.entries(columns).map(([columnId, items]) => (
						<KanbanColumn
							key={columnId}
							value={columnId}
							className="flex flex-col gap-3"
						>
							<Card size="sm" className="kanban-column-header py-4">
								<CardHeader className="border-0 px-4 py-0">
									<CardTitle className="flex items-center justify-between text-sm font-semibold">
										<span>{columnId}</span>
										<Badge variant="secondary">{items.length}</Badge>
									</CardTitle>
								</CardHeader>
							</Card>
							<KanbanColumnContent
								value={columnId}
								className="flex min-h-48 flex-col gap-3"
							>
								{items.map((item) => (
									<KanbanItem key={item.id} value={item.id}>
										<KanbanItemHandle>
											<Card
												size="sm"
												className="kanban-card cursor-grab py-4 active:cursor-grabbing"
												onClick={() => openTask(item.id)}
											>
												<CardHeader className="border-0 px-4 py-0">
													<CardTitle className="text-sm leading-snug">
														<span className="text-muted-foreground mr-1.5 font-mono text-xs">
															#{item.number}
														</span>
														{item.title}
													</CardTitle>
												</CardHeader>
												<CardContent className="flex flex-col gap-2 px-4 pt-3">
													<div className="flex flex-wrap gap-1.5">
														<Badge
															variant={
																item.priority === "high"
																	? "destructive"
																	: item.priority === "medium"
																		? "default"
																		: "secondary"
															}
														>
															{PRIORITY_LABEL[item.priority]}
														</Badge>
														{item.workstream ? (
															<Badge variant="outline" className="font-normal">
																{item.workstream}
															</Badge>
														) : null}
														{item.specApproval === "pending" ? (
															<Badge variant="secondary" className="font-normal">
																Spec pending
															</Badge>
														) : null}
													</div>
													{item.specRelations.length > 0 ? (
														<SpecRelationsList
															relations={item.specRelations}
															compact
														/>
													) : null}
													<p className="text-muted-foreground text-xs">
														{item.owner || "Unassigned"}
													</p>
												</CardContent>
											</Card>
										</KanbanItemHandle>
									</KanbanItem>
								))}
							</KanbanColumnContent>
						</KanbanColumn>
					))}
				</KanbanBoard>
				<KanbanOverlay>
					<div className="bg-muted size-full rounded-2xl ring-1 ring-foreground/10" />
				</KanbanOverlay>
			</Kanban>
			<IssueDetailSheet
				task={selectedTask}
				open={detailOpen}
				onOpenChange={setDetailOpen}
				canManage={canManage}
			/>
		</>
	);
}
