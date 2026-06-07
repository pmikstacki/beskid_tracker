import "@tanstack/react-start/server-only";

import type { Octokit } from "@octokit/rest";

import { BUG_LABEL } from "#/lib/github/bug-mappers";
import { ensureVersionMilestone } from "#/lib/github/milestones-service";
import { repoParams } from "#/lib/github/octokit";
import { buildRoadmapIssueLabels } from "#/lib/github/roadmap-issue-labels";
import type { RoadmapTask } from "#/lib/github/types";
import {
	upsertSpecRelationsInBody,
	type SpecRelation,
} from "#/lib/platform-spec/relations";
import {
	upsertSubtasksInBody,
	type SubtaskRow,
} from "#/lib/roadmap/subtasks";
import { seedIdMarker } from "#/lib/seed/import-to-github";
import { getIssuesDatabase } from "#/lib/storage/db";
import type { GitHubIssuePayload } from "#/lib/storage/stored-issue";
import { trackerTaskToRoadmapTask } from "#/lib/tracker/mappers";
import { getTrackerBug } from "#/lib/tracker/repositories/bugs-repository";
import {
	getGithubIssueLink,
	upsertGithubIssueLink,
} from "#/lib/tracker/repositories/github-links-repository";
import {
	deleteGithubSyncOutboxEntry,
	listGithubSyncOutbox,
	markGithubSyncAttempt,
} from "#/lib/tracker/repositories/outbox-repository";
import {
	getTrackerTask,
	listTrackerDeliverables,
} from "#/lib/tracker/repositories/tasks-repository";
import {
	isBugInGithubSyncScope,
	isTaskInGithubSyncScope,
} from "#/lib/tracker/sync-scope";
import {
	getTrackerSyncSettings,
	markTrackerExportCompleted,
	resolveTrackerActiveVersionId,
} from "#/lib/tracker/sync-settings";
import {
	parseTrackerTaskEntityId,
	trackerTaskEntityId,
	type GithubSyncOutboxEntry,
	type TrackerTask,
} from "#/lib/tracker/types";

export interface GithubExportResult {
	processed: number;
	succeeded: number;
	failed: number;
	skipped: number;
	errors: string[];
}

function bodyWithTaskIdMarker(body: string, taskId: string): string {
	const marker = seedIdMarker(taskId);
	return body.includes(marker) ? body : `${body}\n\n${marker}`;
}

function relationsToSpecRelations(task: TrackerTask): SpecRelation[] {
	return task.specRelations.map((relation) => ({
		path: relation.path,
		href: relation.href ?? relation.path,
		title: relation.title,
		level: relation.level,
		relation: relation.relation,
		required: relation.required,
	}));
}

function subtasksToRows(task: TrackerTask): SubtaskRow[] {
	return task.subtasks.map((step) => ({
		id: `db-step-${step.id}`,
		text: step.text,
		done: step.done,
	}));
}

function buildTaskExportBody(task: TrackerTask): string {
	let body = task.body;
	body = upsertSpecRelationsInBody(body, relationsToSpecRelations(task));
	body = upsertSubtasksInBody(body, subtasksToRows(task));
	return bodyWithTaskIdMarker(body, task.id);
}

function buildRoadmapTaskForExport(task: TrackerTask): RoadmapTask {
	const db = getIssuesDatabase();
	const deliverableTitle = task.deliverableId
		? listTrackerDeliverables(task.versionId, db).find(
				(item) => item.id === task.deliverableId,
			)?.title
		: undefined;
	const link = getGithubIssueLink(
		"task",
		trackerTaskEntityId(task.versionId, task.id),
		db,
	);
	return trackerTaskToRoadmapTask({
		...task,
		githubLink: link ?? undefined,
		deliverableTitle,
		displayNumber: link?.githubNumber ?? task.sortOrder,
	});
}

async function fetchGithubIssue(
	octokit: Octokit,
	issueNumber: number,
): Promise<GitHubIssuePayload> {
	const { data } = await octokit.rest.issues.get({
		...repoParams(),
		issue_number: issueNumber,
	});
	return data;
}

async function exportTaskEntry(
	octokit: Octokit,
	entry: GithubSyncOutboxEntry,
	activeVersionId: string | null,
): Promise<void> {
	const parsed = parseTrackerTaskEntityId(entry.entityId);
	if (!parsed) {
		throw new Error(`Invalid task entity id: ${entry.entityId}`);
	}

	const db = getIssuesDatabase();
	const task = getTrackerTask(parsed.versionId, parsed.taskId, db);
	if (!task) {
		throw new Error(`Task not found: ${entry.entityId}`);
	}
	if (!isTaskInGithubSyncScope(task, activeVersionId)) {
		return;
	}

	const roadmapTask = buildRoadmapTaskForExport(task);
	const body = buildTaskExportBody(task);
	const labels = buildRoadmapIssueLabels(roadmapTask);
	const state = task.statusColumn === "Done" ? "closed" : "open";
	const milestone = await ensureVersionMilestone(octokit, task.versionId);
	const link = getGithubIssueLink("task", entry.entityId, db);

	if (entry.operation === "delete") {
		if (!link) return;
		await octokit.rest.issues.update({
			...repoParams(),
			issue_number: link.githubNumber,
			state: "closed",
		});
		const data = await fetchGithubIssue(octokit, link.githubNumber);
		upsertGithubIssueLink(db, {
			entityType: "task",
			entityId: entry.entityId,
			githubNumber: link.githubNumber,
			githubUrl: data.html_url,
			githubUpdatedAt: data.updated_at ?? undefined,
			syncState: "synced",
		});
		return;
	}

	if (entry.operation === "labels" && link) {
		await octokit.rest.issues.setLabels({
			...repoParams(),
			issue_number: link.githubNumber,
			labels,
		});
		const data = await fetchGithubIssue(octokit, link.githubNumber);
		upsertGithubIssueLink(db, {
			entityType: "task",
			entityId: entry.entityId,
			githubNumber: link.githubNumber,
			githubUrl: data.html_url,
			githubUpdatedAt: data.updated_at ?? undefined,
			syncState: "synced",
		});
		return;
	}

	if (link) {
		await octokit.rest.issues.update({
			...repoParams(),
			issue_number: link.githubNumber,
			title: task.title,
			body,
			state,
			milestone: milestone.number,
		});
		await octokit.rest.issues.setLabels({
			...repoParams(),
			issue_number: link.githubNumber,
			labels,
		});
		const data = await fetchGithubIssue(octokit, link.githubNumber);
		upsertGithubIssueLink(db, {
			entityType: "task",
			entityId: entry.entityId,
			githubNumber: link.githubNumber,
			githubUrl: data.html_url,
			githubUpdatedAt: data.updated_at ?? undefined,
			syncState: "synced",
		});
		return;
	}

	const { data } = await octokit.rest.issues.create({
		...repoParams(),
		title: task.title,
		body: body || undefined,
		labels,
		milestone: milestone.number,
		state,
	});
	upsertGithubIssueLink(db, {
		entityType: "task",
		entityId: entry.entityId,
		githubNumber: data.number,
		githubUrl: data.html_url,
		githubUpdatedAt: data.updated_at ?? undefined,
		syncState: "synced",
	});
}

async function exportBugEntry(
	octokit: Octokit,
	entry: GithubSyncOutboxEntry,
): Promise<void> {
	const db = getIssuesDatabase();
	const bug = getTrackerBug(entry.entityId, db);
	if (!bug) {
		throw new Error(`Bug not found: ${entry.entityId}`);
	}
	if (!isBugInGithubSyncScope(bug)) {
		return;
	}

	const link = getGithubIssueLink("bug", entry.entityId, db);
	const state = bug.state;
	const body = bug.body.trim() || undefined;

	if (entry.operation === "delete") {
		if (!link) return;
		await octokit.rest.issues.update({
			...repoParams(),
			issue_number: link.githubNumber,
			state: "closed",
		});
		const data = await fetchGithubIssue(octokit, link.githubNumber);
		upsertGithubIssueLink(db, {
			entityType: "bug",
			entityId: entry.entityId,
			githubNumber: link.githubNumber,
			githubUrl: data.html_url,
			githubUpdatedAt: data.updated_at ?? undefined,
			syncState: "synced",
		});
		return;
	}

	if (link) {
		await octokit.rest.issues.update({
			...repoParams(),
			issue_number: link.githubNumber,
			title: bug.title,
			body,
			state,
		});
		if (entry.operation !== "labels") {
			await octokit.rest.issues.setLabels({
				...repoParams(),
				issue_number: link.githubNumber,
				labels: [BUG_LABEL],
			});
		}
		const data = await fetchGithubIssue(octokit, link.githubNumber);
		upsertGithubIssueLink(db, {
			entityType: "bug",
			entityId: entry.entityId,
			githubNumber: link.githubNumber,
			githubUrl: data.html_url,
			githubUpdatedAt: data.updated_at ?? undefined,
			syncState: "synced",
		});
		return;
	}

	const { data } = await octokit.rest.issues.create({
		...repoParams(),
		title: bug.title,
		body,
		labels: [BUG_LABEL],
		state,
	});
	upsertGithubIssueLink(db, {
		entityType: "bug",
		entityId: entry.entityId,
		githubNumber: data.number,
		githubUrl: data.html_url,
		githubUpdatedAt: data.updated_at ?? undefined,
		syncState: "synced",
	});
}

async function processOutboxEntry(
	octokit: Octokit,
	entry: GithubSyncOutboxEntry,
	activeVersionId: string | null,
	exportBugs: boolean,
	exportActiveVersionTasks: boolean,
): Promise<"succeeded" | "skipped"> {
	if (entry.entityType === "bug") {
		if (!exportBugs) return "skipped";
		await exportBugEntry(octokit, entry);
		return "succeeded";
	}

	if (!exportActiveVersionTasks) return "skipped";
	await exportTaskEntry(octokit, entry, activeVersionId);
	return "succeeded";
}

export async function processGithubSyncOutboxEntries(
	octokit: Octokit,
	limit = 100,
): Promise<GithubExportResult> {
	const db = getIssuesDatabase();
	const settings = getTrackerSyncSettings(db);
	if (!settings.enabled) {
		return {
			processed: 0,
			succeeded: 0,
			failed: 0,
			skipped: 0,
			errors: [],
		};
	}

	const activeVersionId = resolveTrackerActiveVersionId(db);
	const entries = listGithubSyncOutbox(limit, db);
	const result: GithubExportResult = {
		processed: entries.length,
		succeeded: 0,
		failed: 0,
		skipped: 0,
		errors: [],
	};

	for (const entry of entries) {
		try {
			const outcome = await processOutboxEntry(
				octokit,
				entry,
				activeVersionId,
				settings.exportBugs,
				settings.exportActiveVersionTasks,
			);
			if (outcome === "skipped") {
				result.skipped += 1;
				deleteGithubSyncOutboxEntry(entry.id, db);
				continue;
			}
			deleteGithubSyncOutboxEntry(entry.id, db);
			result.succeeded += 1;
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "GitHub export failed";
			markGithubSyncAttempt(entry.id, message, db);
			result.failed += 1;
			result.errors.push(`${entry.entityType}:${entry.entityId}: ${message}`);
		}
	}

	if (result.succeeded > 0) {
		markTrackerExportCompleted(db);
	}

	return result;
}
