import "@tanstack/react-start/server-only";

import { issueToPublicBug } from "#/lib/github/bug-mappers";
import { issueToRoadmapTask } from "#/lib/github/mappers";
import { getIssuesDatabase } from "#/lib/storage/db";
import type { GitHubIssuePayload } from "#/lib/storage/stored-issue";
import { recordGithubWebhookDelivery } from "#/lib/sync/github-webhook-config";
import {
	applyInboundTrackerBug,
	getTrackerBug,
} from "#/lib/tracker/repositories/bugs-repository";
import {
	deleteGithubIssueLink,
	getGithubIssueLink,
	getGithubIssueLinkByNumber,
	upsertGithubIssueLink,
} from "#/lib/tracker/repositories/github-links-repository";
import {
	applyInboundTrackerTask,
	getTrackerTask,
} from "#/lib/tracker/repositories/tasks-repository";
import {
	isBugInGithubSyncScope,
	isTaskInGithubSyncScope,
} from "#/lib/tracker/sync-scope";
import {
	getTrackerSyncSettings,
	markTrackerInboundCompleted,
	resolveTrackerActiveVersionId,
} from "#/lib/tracker/sync-settings";
import { trackerTaskEntityId, parseTrackerTaskEntityId } from "#/lib/tracker/types";

export interface GithubInboundResult {
	applied: boolean;
	entityType?: "task" | "bug";
	entityId?: string;
	conflict?: boolean;
	skipped?: boolean;
	reason?: string;
}

interface IssuesWebhookPayload {
	action: string;
	issue?: GitHubIssuePayload;
}

const SEED_ID_MARKER = "tracker-seed-id:";

function extractSeedTaskId(body: string): string | null {
	const markerMatch = body.match(
		new RegExp(`<!--\\s*${SEED_ID_MARKER}([^>]+)\\s*-->`, "i"),
	);
	return markerMatch?.[1]?.trim() ?? null;
}

function githubUpdatedAt(issue: GitHubIssuePayload): string {
	return issue.updated_at ?? new Date().toISOString();
}

function hasConcurrentEdit(
	localUpdatedAt: string,
	githubUpdatedAtValue: string,
	lastSyncedAt: string | undefined,
	previousGithubUpdatedAt: string | undefined,
): boolean {
	if (!lastSyncedAt) return false;
	const localChanged = localUpdatedAt > lastSyncedAt;
	const githubChanged =
		githubUpdatedAtValue > (previousGithubUpdatedAt ?? lastSyncedAt);
	return localChanged && githubChanged;
}

function resolveInboundTaskId(
	issue: GitHubIssuePayload,
	existingEntityId: string | null,
): string {
	if (existingEntityId) {
		const parsed = parseTrackerTaskEntityId(existingEntityId);
		if (parsed) return parsed.taskId;
	}
	return extractSeedTaskId(issue.body ?? "") ?? `gh-${issue.number}`;
}

function applyInboundBug(
	issue: GitHubIssuePayload,
): GithubInboundResult {
	const db = getIssuesDatabase();
	const bug = issueToPublicBug(issue);
	if (!bug) {
		return { applied: false, skipped: true, reason: "not-a-bug" };
	}
	if (!isBugInGithubSyncScope({ id: bug.number.toString() })) {
		return { applied: false, skipped: true, reason: "out-of-scope" };
	}

	const entityId = String(bug.number);
	const link =
		getGithubIssueLink("bug", entityId, db) ??
		getGithubIssueLinkByNumber(issue.number, db);
	const existing = getTrackerBug(link?.entityId ?? entityId, db);
	const githubAt = githubUpdatedAt(issue);

	if (existing && link) {
		const concurrent = hasConcurrentEdit(
			existing.localUpdatedAt,
			githubAt,
			link.lastSyncedAt,
			link.githubUpdatedAt,
		);
		if (concurrent) {
			if (githubAt > existing.localUpdatedAt) {
				applyInboundTrackerBug(db, existing.id, {
					title: issue.title,
					body: issue.body ?? "",
					state: issue.state === "closed" ? "closed" : "open",
					author: issue.user?.login,
					localUpdatedAt: githubAt,
				});
				upsertGithubIssueLink(db, {
					entityType: "bug",
					entityId: existing.id,
					githubNumber: issue.number,
					githubUrl: issue.html_url,
					githubUpdatedAt: githubAt,
					syncState: "synced",
				});
				return {
					applied: true,
					entityType: "bug",
					entityId: existing.id,
				};
			}
			upsertGithubIssueLink(db, {
				entityType: "bug",
				entityId: existing.id,
				githubNumber: issue.number,
				githubUrl: issue.html_url,
				githubUpdatedAt: githubAt,
				syncState: "synced",
			});
			return {
				applied: false,
				entityType: "bug",
				entityId: existing.id,
				skipped: true,
				reason: "local-newer",
			};
		}
	}

	const resolvedEntityId = link?.entityId ?? entityId;
	applyInboundTrackerBug(db, resolvedEntityId, {
		title: issue.title,
		body: issue.body ?? "",
		state: issue.state === "closed" ? "closed" : "open",
		author: issue.user?.login,
		localUpdatedAt: githubAt,
	});
	upsertGithubIssueLink(db, {
		entityType: "bug",
		entityId: resolvedEntityId,
		githubNumber: issue.number,
		githubUrl: issue.html_url,
		githubUpdatedAt: githubAt,
		syncState: "synced",
	});
	return {
		applied: true,
		entityType: "bug",
		entityId: resolvedEntityId,
	};
}

function applyInboundTask(
	issue: GitHubIssuePayload,
	activeVersionId: string | null,
): GithubInboundResult {
	const roadmapTask = issueToRoadmapTask(issue);
	if (!roadmapTask) {
		return { applied: false, skipped: true, reason: "not-a-roadmap-task" };
	}
	if (!isTaskInGithubSyncScope({ versionId: roadmapTask.version }, activeVersionId)) {
		return { applied: false, skipped: true, reason: "out-of-scope" };
	}

	const db = getIssuesDatabase();
	const link = getGithubIssueLinkByNumber(issue.number, db);
	const taskId = resolveInboundTaskId(issue, link?.entityId ?? null);
	const entityId = trackerTaskEntityId(roadmapTask.version, taskId);
	const existing = getTrackerTask(roadmapTask.version, taskId, db);
	const githubAt = githubUpdatedAt(issue);

	if (existing && link) {
		const concurrent = hasConcurrentEdit(
			existing.localUpdatedAt,
			githubAt,
			link.lastSyncedAt,
			link.githubUpdatedAt,
		);
		if (concurrent) {
			upsertGithubIssueLink(db, {
				entityType: "task",
				entityId,
				githubNumber: issue.number,
				githubUrl: issue.html_url,
				githubUpdatedAt: githubAt,
				syncState: "conflict",
			});
			return {
				applied: false,
				entityType: "task",
				entityId,
				conflict: true,
				reason: "local-wins",
			};
		}
	}

	applyInboundTrackerTask(db, roadmapTask.version, taskId, {
		title: roadmapTask.title,
		statusColumn: roadmapTask.statusColumn,
		priority: roadmapTask.priority,
		workstream: roadmapTask.workstream,
		domain: roadmapTask.domain,
		area: roadmapTask.area,
		feature: roadmapTask.feature,
		owner: roadmapTask.owner,
		body: issue.body ?? "",
		specApproval: roadmapTask.specApproval,
		completedAt:
			roadmapTask.statusColumn === "Done" ? githubAt.slice(0, 10) : undefined,
		subtasks: roadmapTask.subtasks.map((item) => ({
			text: item.text,
			done: item.done,
		})),
		specRelations: roadmapTask.specRelations.map((relation) => ({
			path: relation.path,
			href: relation.href,
			title: relation.title,
			level: relation.level,
			relation: relation.relation,
			required: relation.required,
		})),
		localUpdatedAt: githubAt,
	});
	upsertGithubIssueLink(db, {
		entityType: "task",
		entityId,
		githubNumber: issue.number,
		githubUrl: issue.html_url,
		githubUpdatedAt: githubAt,
		syncState: "synced",
	});
	return {
		applied: true,
		entityType: "task",
		entityId,
	};
}

function isBugIssue(issue: GitHubIssuePayload): boolean {
	return Boolean(issueToPublicBug(issue));
}

export function applyGithubIssueInbound(
	payload: IssuesWebhookPayload,
): GithubInboundResult {
	const issue = payload.issue;
	if (!issue?.number || issue.pull_request) {
		return { applied: false, skipped: true, reason: "unsupported-issue" };
	}

	const db = getIssuesDatabase();
	const settings = getTrackerSyncSettings(db);
	if (!settings.enabled) {
		return { applied: false, skipped: true, reason: "sync-disabled" };
	}

	let result: GithubInboundResult;

	if (payload.action === "deleted") {
		const link = getGithubIssueLinkByNumber(issue.number, db);
		if (link) {
			deleteGithubIssueLink(link.entityType, link.entityId, db);
		}
		recordGithubWebhookDelivery(payload.action);
		markTrackerInboundCompleted(db);
		return {
			applied: true,
			entityType: link?.entityType,
			entityId: link?.entityId,
			reason: "deleted",
		};
	}

	const activeVersionId = resolveTrackerActiveVersionId(db);
	if (isBugIssue(issue)) {
		result = applyInboundBug(issue);
	} else {
		result = applyInboundTask(issue, activeVersionId);
	}

	recordGithubWebhookDelivery(payload.action);
	if (result.applied) {
		markTrackerInboundCompleted(db);
	}

	return result;
}
