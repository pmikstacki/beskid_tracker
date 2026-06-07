import "@tanstack/react-start/server-only";

import type { Database } from "bun:sqlite";

import type { RoadmapColumnId } from "#/lib/github/roadmap-labels";
import type { RoadmapTask } from "#/lib/github/types";
import type { SpecRelation } from "#/lib/platform-spec/relations";
import type { SubtaskRow } from "#/lib/report-issue/field-values";
import { seedIdMarker } from "#/lib/seed/import-to-github";
import type { SeedSubtask, SeedTask } from "#/lib/seed/schemas";
import { getIssuesDatabase } from "#/lib/storage/db";
import { resolveActiveVersionId } from "#/lib/tracker/active-version";
import { trackerTaskToRoadmapTask } from "#/lib/tracker/mappers";
import { getRoadmapIssue } from "#/lib/tracker/read-service";
import {
	getGithubIssueLink,
	getGithubIssueLinkByNumber,
} from "#/lib/tracker/repositories/github-links-repository";
import { enqueueGithubSync } from "#/lib/tracker/repositories/outbox-repository";
import {
	getSyncSetting,
	SYNC_SETTING_KEYS,
} from "#/lib/tracker/repositories/sync-settings-repository";
import {
	getTrackerTask,
	listTrackerDeliverables,
	upsertTrackerTask,
} from "#/lib/tracker/repositories/tasks-repository";
import { listTrackerVersions } from "#/lib/tracker/repositories/versions-repository";
import { isTaskInGithubSyncScope } from "#/lib/tracker/sync-scope";
import {
	type GithubSyncOperation,
	parseTrackerTaskEntityId,
	type TrackerTask,
	trackerTaskEntityId,
} from "#/lib/tracker/types";

export interface CreateRoadmapTaskInput {
	title: string;
	body: string;
	priority: "high" | "medium" | "low";
	statusColumn: RoadmapColumnId;
	version: string;
	workstream?: string;
	specRelations: SpecRelation[];
	taskId?: string;
	owner?: string;
}

export interface UpdateRoadmapTaskInput {
	issueNumber?: number;
	versionId?: string;
	taskId?: string;
	title?: string;
	body?: string;
	priority?: "high" | "medium" | "low";
	specRelations?: SpecRelation[];
	subtasks?: SubtaskRow[];
	workstream?: string;
	statusColumn?: RoadmapColumnId;
}

export interface TaskRef {
	issueNumber?: number;
	versionId?: string;
	taskId?: string;
}

function resolveActiveVersionIdForSync(db: Database): string | null {
	const override = getSyncSetting(SYNC_SETTING_KEYS.activeVersionOverride, db);
	if (override?.trim()) return override.trim();
	return resolveActiveVersionId(
		listTrackerVersions(db).map((version) => ({
			id: version.id,
			status: version.status,
		})),
	);
}

function slugifyTaskId(title: string): string {
	const slug = title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 48);
	return slug || "task";
}

function uniqueTaskId(db: Database, versionId: string, title: string): string {
	const base = slugifyTaskId(title);
	let candidate = base;
	let suffix = 2;
	while (getTrackerTask(versionId, candidate, db)) {
		candidate = `${base}-${suffix}`;
		suffix += 1;
	}
	return candidate;
}

function specRelationsToSeed(
	relations: SpecRelation[],
): SeedTask["specRelations"] {
	return relations.map((relation) => ({
		path: relation.path,
		href: relation.href,
		title: relation.title,
		level: relation.level,
		relation: relation.relation,
		required: relation.required,
	}));
}

function subtasksToSeed(subtasks: SubtaskRow[]): SeedSubtask[] {
	return subtasks.map((step) => ({
		text: step.text,
		done: step.done,
	}));
}

function trackerTaskToSeedTask(task: TrackerTask, taskId: string): SeedTask {
	return {
		id: taskId,
		title: task.title,
		statusColumn: task.statusColumn,
		priority: task.priority,
		workstream: task.workstream,
		domain: task.domain,
		area: task.area,
		feature: task.feature,
		owner: task.owner,
		order: task.sortOrder,
		deliverableId: task.deliverableId,
		specRelations: task.specRelations.map((relation) => ({
			path: relation.path,
			href: relation.href,
			title: relation.title,
			level: relation.level,
			relation: relation.relation,
			required: relation.required,
		})),
		specApproval: task.specApproval,
		body: task.body,
		subtasks: task.subtasks.map((step) => ({
			text: step.text,
			done: step.done,
		})),
		source: task.source,
		completedAt: task.completedAt,
	};
}

function bodyWithSeedMarker(body: string, taskId: string): string {
	const marker = seedIdMarker(taskId);
	return body.includes(marker) ? body : `${body.trim()}\n\n${marker}`.trim();
}

function maybeEnqueueTaskSync(
	db: Database,
	versionId: string,
	taskId: string,
	operation: GithubSyncOperation,
): void {
	const task = getTrackerTask(versionId, taskId, db);
	if (!task) return;
	const activeVersionId = resolveActiveVersionIdForSync(db);
	if (!isTaskInGithubSyncScope(task, activeVersionId)) return;
	enqueueGithubSync(db, {
		entityType: "task",
		entityId: trackerTaskEntityId(versionId, taskId),
		operation,
	});
}

async function resolveTaskRef(
	input: TaskRef,
): Promise<{ versionId: string; taskId: string; issueNumber?: number }> {
	if (input.versionId && input.taskId) {
		return {
			versionId: input.versionId,
			taskId: input.taskId,
			issueNumber: input.issueNumber,
		};
	}
	if (input.issueNumber !== undefined) {
		const link = getGithubIssueLinkByNumber(input.issueNumber);
		if (!link || link.entityType !== "task") {
			throw new Error(`Roadmap task #${input.issueNumber} not found`);
		}
		const parsed = parseTrackerTaskEntityId(link.entityId);
		if (!parsed) {
			throw new Error(`Invalid task link for issue #${input.issueNumber}`);
		}
		return {
			...parsed,
			issueNumber: input.issueNumber,
		};
	}
	throw new Error("Provide issueNumber or versionId + taskId");
}

function taskToRoadmapTask(
	versionId: string,
	taskId: string,
	db: Database,
	displayNumber?: number,
): RoadmapTask {
	const task = getTrackerTask(versionId, taskId, db);
	if (!task) {
		throw new Error(`Task ${versionId}:${taskId} not found`);
	}
	const githubLink =
		getGithubIssueLink("task", trackerTaskEntityId(versionId, taskId), db) ??
		undefined;
	const deliverableTitle = task.deliverableId
		? listTrackerDeliverables(versionId, db).find(
				(deliverable) => deliverable.id === task.deliverableId,
			)?.title
		: undefined;
	return trackerTaskToRoadmapTask({
		...task,
		githubLink,
		deliverableTitle,
		displayNumber: displayNumber ?? githubLink?.githubNumber ?? task.sortOrder,
	});
}

export async function createRoadmapTask(
	input: CreateRoadmapTaskInput,
	db?: Database,
): Promise<RoadmapTask> {
	const database = db ?? getIssuesDatabase();
	const taskId =
		input.taskId ?? uniqueTaskId(database, input.version, input.title);
	const seedTask: SeedTask = {
		id: taskId,
		title: input.title.trim(),
		statusColumn: input.statusColumn,
		priority: input.priority,
		workstream: input.workstream,
		owner: input.owner,
		specRelations: specRelationsToSeed(input.specRelations),
		specApproval: input.specRelations.length > 0 ? "pending" : undefined,
		body: bodyWithSeedMarker(input.body.trim(), taskId),
		subtasks: [],
		source: {
			repo: "beskid",
			commit: "0000000",
			subject: input.title.trim(),
		},
	};

	const tx = database.transaction(() => {
		upsertTrackerTask(database, input.version, seedTask);
		maybeEnqueueTaskSync(database, input.version, taskId, "create");
	});
	tx();

	return taskToRoadmapTask(input.version, taskId, database);
}

export async function updateRoadmapTask(
	input: UpdateRoadmapTaskInput,
	db?: Database,
): Promise<RoadmapTask> {
	const database = db ?? getIssuesDatabase();
	const { versionId, taskId, issueNumber } = await resolveTaskRef(input);
	const existing = getTrackerTask(versionId, taskId, database);
	if (!existing) {
		throw new Error(`Task ${versionId}:${taskId} not found`);
	}

	const seedTask = trackerTaskToSeedTask(existing, taskId);
	if (input.title !== undefined) seedTask.title = input.title.trim();
	if (input.body !== undefined) {
		seedTask.body = bodyWithSeedMarker(input.body.trim(), taskId);
	} else {
		seedTask.body = bodyWithSeedMarker(seedTask.body ?? "", taskId);
	}
	if (input.priority !== undefined) seedTask.priority = input.priority;
	if (input.workstream !== undefined) seedTask.workstream = input.workstream;
	if (input.statusColumn !== undefined)
		seedTask.statusColumn = input.statusColumn;
	if (input.specRelations !== undefined) {
		seedTask.specRelations = specRelationsToSeed(input.specRelations);
	}
	if (input.subtasks !== undefined) {
		seedTask.subtasks = subtasksToSeed(input.subtasks);
	}

	const tx = database.transaction(() => {
		upsertTrackerTask(database, versionId, seedTask);
		maybeEnqueueTaskSync(database, versionId, taskId, "update");
	});
	tx();

	return taskToRoadmapTask(versionId, taskId, database, issueNumber);
}

export async function moveRoadmapTaskToColumn(
	ref: TaskRef,
	targetColumn: RoadmapColumnId,
	db?: Database,
): Promise<RoadmapTask> {
	return updateRoadmapTask({ ...ref, statusColumn: targetColumn }, db);
}

export function getRoadmapTaskByIssueNumber(
	issueNumber: number,
): RoadmapTask | null {
	return getRoadmapIssue(issueNumber);
}
