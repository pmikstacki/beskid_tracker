#!/usr/bin/env bun
/**
 * Migration helper: pull GitHub Issues into the legacy mirror, then backfill
 * normalized tracker tables.
 *
 * Usage:
 *   bun run sync:issues
 *
 * Prefer Settings → Import seed JSON for fresh installs. Requires
 * GITHUB_SYNC_TOKEN or GITHUB_PUBLIC_READ_TOKEN.
 */

import { backfillFromGithubMirror } from "#/lib/tracker/backfill-from-github";
import { runGitHubIssuesSync } from "#/lib/sync/github-issues-sync";

const result = await runGitHubIssuesSync();

if (!result.ok) {
	console.error(`Pull failed: ${result.error ?? "unknown error"}`);
	process.exit(1);
}

console.log(
	`Pulled ${result.openCount} open issues (${result.bugCount} with bug label); removed ${result.removed} stale mirror rows.`,
);

const backfill = backfillFromGithubMirror();
console.log(
	`Backfill: ${backfill.tasksUpserted} tasks, ${backfill.bugsUpserted} bugs, ${backfill.linksCreated} links (${backfill.skipped} skipped).`,
);
if (backfill.errors.length > 0) {
	console.error(`Backfill errors: ${backfill.errors.join("; ")}`);
	process.exit(1);
}
