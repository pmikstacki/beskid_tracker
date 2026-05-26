import type { Database } from "bun:sqlite";

import { BUG_LABEL } from "#/lib/github/bug-mappers";
import { getIssuesDatabase } from "#/lib/storage/db";
import {
	type GitHubIssuePayload,
	parseIssuePayload,
	serializeIssuePayload,
} from "#/lib/storage/stored-issue";

function labelNamesFromPayload(issue: GitHubIssuePayload): string[] {
	return (issue.labels ?? [])
		.map((label) => (typeof label === "string" ? label : label.name))
		.filter((name): name is string => Boolean(name));
}

function hasBugLabel(issue: GitHubIssuePayload): boolean {
	return labelNamesFromPayload(issue).includes(BUG_LABEL);
}

function isPullRequest(issue: GitHubIssuePayload): boolean {
	return Boolean(issue.pull_request);
}

export function upsertGithubIssue(db: Database, issue: GitHubIssuePayload): void {
	const now = new Date().toISOString();
	const payload = serializeIssuePayload(issue);
	const labelNames = labelNamesFromPayload(issue);

	db.run(
		`
		INSERT INTO github_issues (
			number, state, is_pull_request, has_bug_label, payload, github_updated_at, synced_at
		) VALUES (?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(number) DO UPDATE SET
			state = excluded.state,
			is_pull_request = excluded.is_pull_request,
			has_bug_label = excluded.has_bug_label,
			payload = excluded.payload,
			github_updated_at = excluded.github_updated_at,
			synced_at = excluded.synced_at
		`,
		[
			issue.number,
			issue.state ?? "open",
			isPullRequest(issue) ? 1 : 0,
			hasBugLabel(issue) || labelNames.includes(BUG_LABEL) ? 1 : 0,
			payload,
			issue.updated_at ?? null,
			now,
		],
	);
}

export function upsertGithubIssues(issues: GitHubIssuePayload[]): void {
	const db = getIssuesDatabase();
	const tx = db.transaction((rows: GitHubIssuePayload[]) => {
		for (const issue of rows) {
			upsertGithubIssue(db, issue);
		}
	});
	tx(issues);
}

export function persistGithubIssue(issue: GitHubIssuePayload): void {
	upsertGithubIssue(getIssuesDatabase(), issue);
}

export function deleteIssuesExcept(numbers: Set<number>): number {
	const db = getIssuesDatabase();
	const rows = db.query<{ number: number }, []>("SELECT number FROM github_issues").all();
	let removed = 0;
	for (const row of rows) {
		if (!numbers.has(row.number)) {
			db.run("DELETE FROM github_issues WHERE number = ?", [row.number]);
			removed += 1;
		}
	}
	return removed;
}

export function listStoredOpenIssues(): GitHubIssuePayload[] {
	const db = getIssuesDatabase();
	return db
		.query<{ payload: string }, []>(
			`
			SELECT payload FROM github_issues
			WHERE state = 'open' AND is_pull_request = 0
			ORDER BY number ASC
			`,
		)
		.all()
		.map((row) => parseIssuePayload(row.payload));
}

export function listStoredOpenBugs(): GitHubIssuePayload[] {
	const db = getIssuesDatabase();
	return db
		.query<{ payload: string }, []>(
			`
			SELECT payload FROM github_issues
			WHERE state = 'open' AND is_pull_request = 0 AND has_bug_label = 1
			ORDER BY number DESC
			`,
		)
		.all()
		.map((row) => parseIssuePayload(row.payload));
}

export function getStoredIssue(number: number): GitHubIssuePayload | null {
	const db = getIssuesDatabase();
	const row = db
		.query<{ payload: string }, [number]>(
			"SELECT payload FROM github_issues WHERE number = ?",
		)
		.get(number);
	return row ? parseIssuePayload(row.payload) : null;
}

export function countStoredIssues(): number {
	const db = getIssuesDatabase();
	const row = db
		.query<{ count: number }, []>("SELECT COUNT(*) AS count FROM github_issues")
		.get();
	return row?.count ?? 0;
}

export function countPublicBugStats(): { open: number; closed: number } {
	const db = getIssuesDatabase();
	const open = db
		.query<{ count: number }, []>(
			`
			SELECT COUNT(*) AS count FROM github_issues
			WHERE has_bug_label = 1 AND is_pull_request = 0 AND state = 'open'
			`,
		)
		.get()?.count ?? 0;
	const closed = db
		.query<{ count: number }, []>(
			`
			SELECT COUNT(*) AS count FROM github_issues
			WHERE has_bug_label = 1 AND is_pull_request = 0 AND state = 'closed'
			`,
		)
		.get()?.count ?? 0;
	return { open, closed };
}

export function replaceRepoLabels(names: string[]): void {
	const db = getIssuesDatabase();
	const now = new Date().toISOString();
	const tx = db.transaction((labelNames: string[]) => {
		db.run("DELETE FROM repo_labels");
		for (const name of labelNames) {
			db.run("INSERT INTO repo_labels (name, synced_at) VALUES (?, ?)", [
				name,
				now,
			]);
		}
	});
	tx(names);
}

export function listStoredRepoLabels(): string[] {
	const db = getIssuesDatabase();
	return db
		.query<{ name: string }, []>("SELECT name FROM repo_labels ORDER BY name ASC")
		.all()
		.map((row) => row.name);
}

export interface SyncStateSnapshot {
	lastSuccessAt: string | null;
	lastAttemptAt: string | null;
	lastError: string | null;
	openIssueCount: number;
	bugIssueCount: number;
}

export function readSyncState(): SyncStateSnapshot {
	const db = getIssuesDatabase();
	const row = db
		.query<
			{
				last_success_at: string | null;
				last_attempt_at: string | null;
				last_error: string | null;
				open_issue_count: number;
				bug_issue_count: number;
			},
			[]
		>(
			`
			SELECT last_success_at, last_attempt_at, last_error, open_issue_count, bug_issue_count
			FROM sync_state WHERE id = 1
			`,
		)
		.get();

	return {
		lastSuccessAt: row?.last_success_at ?? null,
		lastAttemptAt: row?.last_attempt_at ?? null,
		lastError: row?.last_error ?? null,
		openIssueCount: row?.open_issue_count ?? 0,
		bugIssueCount: row?.bug_issue_count ?? 0,
	};
}

export function writeSyncAttempt(): void {
	const db = getIssuesDatabase();
	db.run("UPDATE sync_state SET last_attempt_at = ?, last_error = NULL WHERE id = 1", [
		new Date().toISOString(),
	]);
}

export function writeSyncSuccess(openCount: number, bugCount: number): void {
	const db = getIssuesDatabase();
	const now = new Date().toISOString();
	db.run(
		`
		UPDATE sync_state SET
			last_success_at = ?,
			last_attempt_at = ?,
			last_error = NULL,
			open_issue_count = ?,
			bug_issue_count = ?
		WHERE id = 1
		`,
		[now, now, openCount, bugCount],
	);
}

export function writeSyncFailure(message: string): void {
	const db = getIssuesDatabase();
	db.run(
		"UPDATE sync_state SET last_attempt_at = ?, last_error = ? WHERE id = 1",
		[new Date().toISOString(), message],
	);
}
