import type { Database } from "bun:sqlite";

export const SCHEMA_VERSION = 1;

export function migrateSchema(db: Database): void {
	db.run(`
		CREATE TABLE IF NOT EXISTS schema_meta (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL
		);
	`);

	const versionRow = db
		.query<{ value: string }, []>("SELECT value FROM schema_meta WHERE key = 'version'")
		.get();

	if (!versionRow) {
		applyV1(db);
		db.run("INSERT INTO schema_meta (key, value) VALUES ('version', ?)", [
			String(SCHEMA_VERSION),
		]);
		return;
	}

	const current = Number.parseInt(versionRow.value, 10);
	if (current < SCHEMA_VERSION) {
		applyV1(db);
		db.run("UPDATE schema_meta SET value = ? WHERE key = 'version'", [
			String(SCHEMA_VERSION),
		]);
	}
}

function applyV1(db: Database): void {
	db.run(`
		CREATE TABLE IF NOT EXISTS github_issues (
			number INTEGER PRIMARY KEY,
			state TEXT NOT NULL,
			is_pull_request INTEGER NOT NULL DEFAULT 0,
			has_bug_label INTEGER NOT NULL DEFAULT 0,
			payload TEXT NOT NULL,
			github_updated_at TEXT,
			synced_at TEXT NOT NULL
		);
	`);

	db.run(`
		CREATE INDEX IF NOT EXISTS idx_github_issues_state
		ON github_issues (state);
	`);

	db.run(`
		CREATE INDEX IF NOT EXISTS idx_github_issues_bug_open
		ON github_issues (has_bug_label, state)
		WHERE has_bug_label = 1;
	`);

	db.run(`
		CREATE TABLE IF NOT EXISTS repo_labels (
			name TEXT PRIMARY KEY,
			synced_at TEXT NOT NULL
		);
	`);

	db.run(`
		CREATE TABLE IF NOT EXISTS sync_state (
			id INTEGER PRIMARY KEY CHECK (id = 1),
			last_success_at TEXT,
			last_attempt_at TEXT,
			last_error TEXT,
			open_issue_count INTEGER NOT NULL DEFAULT 0,
			bug_issue_count INTEGER NOT NULL DEFAULT 0
		);
	`);

	db.run(`
		INSERT OR IGNORE INTO sync_state (id) VALUES (1);
	`);
}
