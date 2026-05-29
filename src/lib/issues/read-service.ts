import "@tanstack/react-start/server-only";

import { issueToPublicBug } from "#/lib/github/bug-mappers";
import { type BoardFilters, filterTasks } from "#/lib/github/filters";
import { issueToRoadmapTask } from "#/lib/github/mappers";
import {
	DEFAULT_DELIVERY_VERSIONS,
	isRoadmapVersionLabel,
} from "#/lib/github/roadmap-labels";
import type {
	PublicBug,
	PublicBugStats,
	RoadmapColumns,
	RoadmapTask,
} from "#/lib/github/types";
import {
	countPublicBugStats,
	countStoredIssues,
	getStoredIssue,
	listStoredOpenBugs,
	listStoredOpenIssues,
	listStoredRepoLabels,
} from "#/lib/storage/issues-repository";
import { ensureIssuesSyncedReady } from "#/lib/sync/github-issues-sync";

function tasksFromStore(): RoadmapTask[] {
	return listStoredOpenIssues()
		.map(issueToRoadmapTask)
		.filter((task): task is RoadmapTask => task !== null);
}

export async function listAllRoadmapTasksFromStore(): Promise<RoadmapTask[]> {
	await ensureIssuesSyncedReady();
	return tasksFromStore();
}

export async function listPublicBugsFromStore(): Promise<PublicBug[]> {
	await ensureIssuesSyncedReady();
	return listStoredOpenBugs()
		.map(issueToPublicBug)
		.filter((bug): bug is PublicBug => bug !== null);
}

export async function fetchPublicBugStatsFromStore(): Promise<PublicBugStats> {
	await ensureIssuesSyncedReady();
	return countPublicBugStats();
}

export async function listRoadmapBoardFromStore(
	filters: BoardFilters,
): Promise<{
	tasks: RoadmapTask[];
	columns: RoadmapColumns;
}> {
	const all = await listAllRoadmapTasksFromStore();
	const tasks = filterTasks(all, filters);
	const columns = {
		Backlog: [] as RoadmapTask[],
		"In Progress": [] as RoadmapTask[],
		Done: [] as RoadmapTask[],
	};
	for (const task of tasks) {
		columns[task.statusColumn].push(task);
	}
	for (const key of Object.keys(columns) as (keyof typeof columns)[]) {
		columns[key].sort((a, b) => a.number - b.number);
	}
	return { tasks, columns };
}

export function getRoadmapIssueFromStore(
	issueNumber: number,
): RoadmapTask | null {
	const stored = getStoredIssue(issueNumber);
	if (!stored) return null;
	return issueToRoadmapTask(stored);
}

export async function listVersionLabelsFromStore(): Promise<string[]> {
	await ensureIssuesSyncedReady();
	const fromRepo = listStoredRepoLabels()
		.filter((name) => isRoadmapVersionLabel(name))
		.map((name) => name.slice("roadmap/version/".length));
	const merged = new Set([...DEFAULT_DELIVERY_VERSIONS, ...fromRepo]);
	return [...merged].sort();
}

export function hasIssueStoreData(): boolean {
	return countStoredIssues() > 0;
}
