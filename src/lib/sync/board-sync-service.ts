import type { Octokit } from "@octokit/rest";

import { BUG_LABEL } from "#/lib/github/bug-mappers";
import { repoParams } from "#/lib/github/octokit";
import {
	deleteIssuesExcept,
	replaceRepoLabels,
	upsertGithubIssues,
	writeSyncAttempt,
	writeSyncFailure,
	writeSyncSuccess,
} from "#/lib/storage/issues-repository";
import type { GitHubIssuePayload } from "#/lib/storage/stored-issue";
import { isGithubSyncDisabled } from "#/lib/sync/github-webhook-config";
import {
	createSyncOctokit,
	hasGithubSyncCredentials,
} from "#/lib/sync/sync-octokit";
import {
	createSyncRun,
	getActiveSyncRun,
	pruneOldSyncRuns,
	type SyncRunHandle,
} from "#/lib/sync/sync-run-repository";

export interface BoardSyncPullResult {
	ok: boolean;
	openCount: number;
	bugCount: number;
	removed: number;
	error?: string;
	runId: string;
}

let pullInFlight: Promise<BoardSyncPullResult> | null = null;

async function paginateIssues(
	octokit: Octokit,
	params: {
		state: "open" | "closed" | "all";
		labels?: string;
	},
): Promise<GitHubIssuePayload[]> {
	return octokit.paginate(octokit.rest.issues.listForRepo, {
		...repoParams(),
		state: params.state,
		labels: params.labels,
		per_page: 100,
	}) as Promise<GitHubIssuePayload[]>;
}

async function syncRepoLabels(
	octokit: Octokit,
	run: SyncRunHandle,
): Promise<void> {
	run.setPhase("Fetching repository labels");
	const { data } = await octokit.issues.listLabelsForRepo(repoParams());
	replaceRepoLabels(
		data
			.map((label) => label.name)
			.filter((name): name is string => Boolean(name)),
	);
	run.log(`Cached ${data.length} labels`);
}

export async function runBoardSyncPull(options?: {
	octokit?: Octokit;
	run?: SyncRunHandle;
	source?: string;
}): Promise<BoardSyncPullResult> {
	const octokit = options?.octokit ?? createSyncOctokit();
	const run = options?.run ?? createSyncRun("pull");
	const source = options?.source ?? "manual";

	writeSyncAttempt();
	run.log(
		`Pull from GitHub (${source}) — one-time bootstrap or manual refresh`,
	);

	try {
		run.setPhase("Fetching open issues");
		const openIssues = await paginateIssues(octokit, { state: "open" });
		run.setProgress(1, 3);
		run.log(`Fetched ${openIssues.length} open issues`);

		run.setPhase("Fetching closed bugs");
		const closedBugs = await paginateIssues(octokit, {
			state: "closed",
			labels: BUG_LABEL,
		});
		run.setProgress(2, 3);
		run.log(`Fetched ${closedBugs.length} closed bugs`);

		await syncRepoLabels(octokit, run);

		run.setPhase("Writing local cache");
		const byNumber = new Map<number, GitHubIssuePayload>();
		for (const issue of [...openIssues, ...closedBugs]) {
			byNumber.set(issue.number, issue);
		}

		const merged = [...byNumber.values()];
		upsertGithubIssues(merged);
		const removed = deleteIssuesExcept(new Set(byNumber.keys()));
		run.log(`Upserted ${merged.length} issues, removed ${removed} stale rows`);

		const openCount = merged.filter(
			(i) => i.state === "open" && !i.pull_request,
		).length;
		const bugCount = merged.filter(
			(i) =>
				!i.pull_request &&
				(i.labels ?? []).some((l) => {
					const name = typeof l === "string" ? l : l.name;
					return name === BUG_LABEL;
				}),
		).length;

		writeSyncSuccess(openCount, bugCount);
		const summary = `Synced ${openCount} open issues (${bugCount} bugs), removed ${removed} stale`;
		run.complete(summary);
		pruneOldSyncRuns();

		return { ok: true, openCount, bugCount, removed, runId: run.id };
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "GitHub board sync failed";
		writeSyncFailure(message);
		run.fail(message);
		pruneOldSyncRuns();
		return {
			ok: false,
			openCount: 0,
			bugCount: 0,
			removed: 0,
			error: message,
			runId: run.id,
		};
	}
}

export function triggerBoardSyncPull(
	force = false,
): Promise<BoardSyncPullResult> {
	if (!force && pullInFlight) return pullInFlight;

	const run = createSyncRun("pull");
	const promise = runBoardSyncPull({ run, source: "manual" }).finally(() => {
		if (pullInFlight === promise) pullInFlight = null;
	});
	pullInFlight = promise;
	return promise;
}

/** Runs a full GitHub pull only when the local mirror is empty (first bootstrap). */
export async function ensureBoardSyncedReady(): Promise<void> {
	if (isGithubSyncDisabled()) return;
	if (!hasGithubSyncCredentials()) return;

	const { countStoredIssues } = await import("#/lib/storage/issues-repository");

	if (countStoredIssues() === 0) {
		if (getActiveSyncRun()) return;
		await triggerBoardSyncPull(true);
	}
}
