#!/usr/bin/env bun
/**
 * Pull GitHub Issues into the local SQLite store (used by the tracker UI).
 *
 * Usage:
 *   bun run sync:issues
 *
 * Requires GITHUB_SYNC_TOKEN or GITHUB_PUBLIC_READ_TOKEN (or unauthenticated,
 * subject to low rate limits).
 */

import { readSyncState } from "#/lib/storage/issues-repository";
import { runGitHubIssuesSync } from "#/lib/sync/github-issues-sync";

const result = await runGitHubIssuesSync();

if (!result.ok) {
	console.error(`Sync failed: ${result.error ?? "unknown error"}`);
	process.exit(1);
}

const state = readSyncState();
console.log(
	`Synced ${result.openCount} open issues (${result.bugCount} with bug label); removed ${result.removed} stale rows.`,
);
if (state.lastSuccessAt) {
	console.log(`Last success: ${state.lastSuccessAt}`);
}
