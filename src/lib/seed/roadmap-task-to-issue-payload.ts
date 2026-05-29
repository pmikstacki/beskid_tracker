import "@tanstack/react-start/server-only";

import { env } from "#/env.server";
import type { RoadmapTask } from "#/lib/github/types";
import type { GitHubIssuePayload } from "#/lib/storage/stored-issue";

function issueHtmlUrl(issueNumber: number): string {
	return `https://github.com/${env.GITHUB_REPO_OWNER}/${env.GITHUB_REPO_NAME}/issues/${issueNumber}`;
}

/** Builds a GitHub-shaped issue payload for the local SQLite mirror from a roadmap task. */
export function roadmapTaskToIssuePayload(
	task: RoadmapTask,
	options?: { state?: "open" | "closed" },
): GitHubIssuePayload {
	const state =
		options?.state ?? (task.statusColumn === "Done" ? "closed" : "open");
	const now = new Date().toISOString();

	return {
		number: task.number,
		title: task.title,
		body: task.body,
		state,
		html_url: task.htmlUrl || issueHtmlUrl(task.number),
		created_at: now,
		updated_at: now,
		labels: task.labelNames.map((name) => ({ name })),
		user: task.owner ? { login: task.owner } : undefined,
		milestone: task.milestone
			? { title: task.milestone.title, number: task.milestone.number }
			: undefined,
	};
}
