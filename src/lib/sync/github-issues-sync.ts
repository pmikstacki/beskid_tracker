import type { Octokit } from "@octokit/rest";

import { BUG_LABEL } from "#/lib/github/bug-mappers";
import { repoParams } from "#/lib/github/octokit";
import {
	deleteIssuesExcept,
	readSyncState,
	replaceRepoLabels,
	upsertGithubIssues,
	writeSyncAttempt,
	writeSyncFailure,
	writeSyncSuccess,
} from "#/lib/storage/issues-repository";
import type { GitHubIssuePayload } from "#/lib/storage/stored-issue";
import { createSyncOctokit } from "#/lib/sync/sync-octokit";

export interface IssuesSyncResult {
	ok: boolean;
	openCount: number;
	bugCount: number;
	removed: number;
	error?: string;
}

let inFlight: Promise<IssuesSyncResult> | null = null;

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

async function syncRepoLabels(octokit: Octokit): Promise<void> {
	const { data } = await octokit.issues.listLabelsForRepo(repoParams());
	replaceRepoLabels(
		data.map((label) => label.name).filter((name): name is string => Boolean(name)),
	);
}

export async function runGitHubIssuesSync(
	octokit: Octokit = createSyncOctokit(),
): Promise<IssuesSyncResult> {
	writeSyncAttempt();

	try {
		const [openIssues, closedBugs] = await Promise.all([
			paginateIssues(octokit, { state: "open" }),
			paginateIssues(octokit, { state: "closed", labels: BUG_LABEL }),
		]);

		await syncRepoLabels(octokit);

		const byNumber = new Map<number, GitHubIssuePayload>();
		for (const issue of [...openIssues, ...closedBugs]) {
			byNumber.set(issue.number, issue);
		}

		const merged = [...byNumber.values()];
		upsertGithubIssues(merged);
		const removed = deleteIssuesExcept(new Set(byNumber.keys()));

		const openCount = merged.filter((i) => i.state === "open" && !i.pull_request).length;
		const bugCount = merged.filter(
			(i) =>
				!i.pull_request &&
				(i.labels ?? []).some((l) => {
					const name = typeof l === "string" ? l : l.name;
					return name === BUG_LABEL;
				}),
		).length;

		writeSyncSuccess(openCount, bugCount);

		return { ok: true, openCount, bugCount, removed };
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "GitHub issues sync failed";
		writeSyncFailure(message);
		return { ok: false, openCount: 0, bugCount: 0, removed: 0, error: message };
	}
}

export function triggerGitHubIssuesSync(force = false): Promise<IssuesSyncResult> {
	if (!force && inFlight) return inFlight;

	const run = runGitHubIssuesSync().finally(() => {
		if (inFlight === run) inFlight = null;
	});
	inFlight = run;
	return run;
}

const DEFAULT_STALE_MS = 5 * 60 * 1000;

function syncStaleMs(): number {
	const raw = process.env.ISSUES_SYNC_STALE_MS?.trim();
	if (!raw) return DEFAULT_STALE_MS;
	const parsed = Number.parseInt(raw, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_STALE_MS;
}

export function isIssuesSyncStale(): boolean {
	const state = readSyncState();
	if (!state.lastSuccessAt) return true;
	const age = Date.now() - Date.parse(state.lastSuccessAt);
	return age > syncStaleMs();
}

export function ensureIssuesSynced(): void {
	if (process.env.ISSUES_SYNC_DISABLED === "1") return;
	if (!isIssuesSyncStale()) return;
	void triggerGitHubIssuesSync();
}

/** Blocks when the store is empty; otherwise refreshes stale data in the background. */
export async function ensureIssuesSyncedReady(): Promise<void> {
	if (process.env.ISSUES_SYNC_DISABLED === "1") return;

	const { countStoredIssues } = await import("#/lib/storage/issues-repository");

	if (countStoredIssues() === 0) {
		await triggerGitHubIssuesSync(true);
		return;
	}

	if (shouldSyncOnStart() && !readSyncState().lastAttemptAt) {
		void triggerGitHubIssuesSync();
		return;
	}

	ensureIssuesSynced();
}

export function shouldSyncOnStart(): boolean {
	return process.env.ISSUES_SYNC_ON_START !== "0";
}
