import "@tanstack/react-start/server-only";

import type { Database } from "bun:sqlite";

import { issueToPublicBug } from "#/lib/github/bug-mappers";
import { issueToRoadmapTask } from "#/lib/github/mappers";
import { parseSeedIdFromBody } from "#/lib/seed/import-to-github";
import type { SeedTask } from "#/lib/seed/schemas";
import { getIssuesDatabase } from "#/lib/storage/db";
import { parseIssuePayload } from "#/lib/storage/stored-issue";
import {
	type UpsertTrackerBugInput,
	upsertTrackerBug,
} from "#/lib/tracker/repositories/bugs-repository";
import { upsertGithubIssueLink } from "#/lib/tracker/repositories/github-links-repository";
import { upsertTrackerTask } from "#/lib/tracker/repositories/tasks-repository";
import { trackerTaskEntityId } from "#/lib/tracker/types";

export interface BackfillFromGithubSummary {
	tasksUpserted: number;
	bugsUpserted: number;
	linksCreated: number;
	skipped: number;
	errors: string[];
}

function taskIdFromIssue(body: string, issueNumber: number): string {
	return parseSeedIdFromBody(body) ?? `gh-${issueNumber}`;
}

function roadmapTaskToSeedTask(
	task: NonNullable<ReturnType<typeof issueToRoadmapTask>>,
	taskId: string,
): SeedTask {
	const specRelations: SeedTask["specRelations"] = task.specRelations.map(
		(relation) => ({
			path: relation.path,
			href: relation.href,
			title: relation.title,
			level: relation.level,
			relation: relation.relation,
			required: relation.required,
		}),
	);
	const subtasks: SeedTask["subtasks"] = task.subtasks.map((step) => ({
		text: step.text,
		done: step.done,
	}));

	return {
		id: taskId,
		title: task.title,
		statusColumn: task.statusColumn,
		priority: task.priority,
		order: task.number,
		workstream: task.workstream,
		domain: task.domain,
		area: task.area,
		feature: task.feature,
		owner: task.owner,
		specRelations,
		specApproval:
			task.specApproval === "pending" || task.specApproval === "approved"
				? task.specApproval
				: undefined,
		body: task.body,
		subtasks,
		source: {
			repo: "beskid",
			commit: "0000000",
			subject: task.title,
			url: task.htmlUrl,
		},
	};
}

function backfillTaskFromIssue(
	db: Database,
	issue: ReturnType<typeof parseIssuePayload>,
	summary: BackfillFromGithubSummary,
): void {
	const roadmapTask = issueToRoadmapTask(issue);
	if (!roadmapTask) return;

	const taskId = taskIdFromIssue(issue.body ?? "", issue.number);
	const seedTask = roadmapTaskToSeedTask(roadmapTask, taskId);
	upsertTrackerTask(db, roadmapTask.version, seedTask);

	const entityId = trackerTaskEntityId(roadmapTask.version, taskId);
	upsertGithubIssueLink(db, {
		entityType: "task",
		entityId,
		githubNumber: issue.number,
		githubUrl: issue.html_url,
		githubUpdatedAt: issue.updated_at ?? undefined,
		syncState: "synced",
	});

	summary.tasksUpserted += 1;
	summary.linksCreated += 1;
}

function backfillBugFromIssue(
	db: Database,
	issue: ReturnType<typeof parseIssuePayload>,
	summary: BackfillFromGithubSummary,
): void {
	const publicBug = issueToPublicBug(issue);
	if (!publicBug) return;

	const bugId = `gh-${issue.number}`;
	const input: UpsertTrackerBugInput = {
		id: bugId,
		title: publicBug.title,
		body: issue.body ?? "",
		state: publicBug.state === "closed" ? "closed" : "open",
		author: publicBug.author,
		fields: {
			labels: publicBug.labels,
			githubNumber: issue.number,
		},
	};

	upsertTrackerBug(db, input);
	upsertGithubIssueLink(db, {
		entityType: "bug",
		entityId: bugId,
		githubNumber: issue.number,
		githubUrl: issue.html_url,
		githubUpdatedAt: issue.updated_at ?? undefined,
		syncState: "synced",
	});

	summary.bugsUpserted += 1;
	summary.linksCreated += 1;
}

export function backfillFromGithubMirror(
	db?: Database,
): BackfillFromGithubSummary {
	const database = db ?? getIssuesDatabase();
	const summary: BackfillFromGithubSummary = {
		tasksUpserted: 0,
		bugsUpserted: 0,
		linksCreated: 0,
		skipped: 0,
		errors: [],
	};

	const rows = database
		.query<{ payload: string }, []>(
			`
			SELECT payload FROM github_issues
			WHERE is_pull_request = 0
			ORDER BY number ASC
			`,
		)
		.all();

	const tx = database.transaction(() => {
		for (const row of rows) {
			try {
				const issue = parseIssuePayload(row.payload);
				const roadmapTask = issueToRoadmapTask(issue);
				const publicBug = issueToPublicBug(issue);

				if (publicBug) {
					backfillBugFromIssue(database, issue, summary);
					continue;
				}

				if (roadmapTask) {
					backfillTaskFromIssue(database, issue, summary);
					continue;
				}

				summary.skipped += 1;
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unknown backfill error";
				summary.errors.push(message);
				summary.skipped += 1;
			}
		}
	});

	tx();
	return summary;
}
