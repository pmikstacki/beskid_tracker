import type { Database } from "bun:sqlite";

export const SCHEMA_VERSION = 4;

export function migrateSchema(db: Database): void {
	db.run(`
		CREATE TABLE IF NOT EXISTS schema_meta (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL
		);
	`);

	const versionRow = db
		.query<{ value: string }, []>(
			"SELECT value FROM schema_meta WHERE key = 'version'",
		)
		.get();

	const current = versionRow ? Number.parseInt(versionRow.value, 10) : 0;

	if (current < 1) {
		applyV1(db);
		db.run(
			"INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('version', '1')",
		);
	}

	if (current < 2) {
		applyV2(db);
		db.run("UPDATE schema_meta SET value = '2' WHERE key = 'version'");
		if (!versionRow) {
			db.run("INSERT INTO schema_meta (key, value) VALUES ('version', '2')");
		}
	}

	if (current < 3) {
		applyV3(db);
		db.run("UPDATE schema_meta SET value = '3' WHERE key = 'version'");
		if (!versionRow) {
			db.run("INSERT INTO schema_meta (key, value) VALUES ('version', '3')");
		}
	}

	if (current < 4) {
		applyV4(db);
		db.run("UPDATE schema_meta SET value = '4' WHERE key = 'version'");
		if (!versionRow) {
			db.run("INSERT INTO schema_meta (key, value) VALUES ('version', '4')");
		}
	}
}

function applyV4(db: Database): void {
	db.run(`
		CREATE TABLE IF NOT EXISTS app_settings (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL,
			updated_at TEXT NOT NULL
		);
	`);
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

function applyV2(db: Database): void {
	db.run(`
		CREATE TABLE IF NOT EXISTS sync_runs (
			id TEXT PRIMARY KEY,
			kind TEXT NOT NULL,
			status TEXT NOT NULL,
			phase TEXT,
			progress_current INTEGER NOT NULL DEFAULT 0,
			progress_total INTEGER NOT NULL DEFAULT 0,
			started_at TEXT NOT NULL,
			finished_at TEXT,
			error TEXT,
			summary TEXT
		);
	`);

	db.run(`
		CREATE TABLE IF NOT EXISTS sync_log_lines (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			run_id TEXT NOT NULL,
			level TEXT NOT NULL DEFAULT 'info',
			message TEXT NOT NULL,
			created_at TEXT NOT NULL,
			FOREIGN KEY (run_id) REFERENCES sync_runs(id) ON DELETE CASCADE
		);
	`);

	db.run(`
		CREATE INDEX IF NOT EXISTS idx_sync_log_lines_run
		ON sync_log_lines (run_id, id);
	`);
}

function applyV3(db: Database): void {
	db.run(`
		CREATE TABLE IF NOT EXISTS spec_proposals (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			summary TEXT NOT NULL DEFAULT '',
			status TEXT NOT NULL DEFAULT 'draft',
			author_login TEXT NOT NULL,
			base_ref TEXT NOT NULL DEFAULT 'main',
			head_branch TEXT,
			pr_number INTEGER,
			pr_url TEXT,
			validation_json TEXT,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL
		);
	`);

	db.run(`
		CREATE INDEX IF NOT EXISTS idx_spec_proposals_status
		ON spec_proposals (status, updated_at DESC);
	`);

	db.run(`
		CREATE TABLE IF NOT EXISTS spec_proposal_changes (
			id TEXT PRIMARY KEY,
			proposal_id TEXT NOT NULL,
			change_kind TEXT NOT NULL,
			repo_path TEXT NOT NULL,
			slug TEXT NOT NULL,
			path_class TEXT NOT NULL,
			spec_level TEXT NOT NULL,
			frontmatter_json TEXT NOT NULL DEFAULT '{}',
			body_md TEXT NOT NULL DEFAULT '',
			layout_json TEXT,
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			FOREIGN KEY (proposal_id) REFERENCES spec_proposals(id) ON DELETE CASCADE
		);
	`);

	db.run(`
		CREATE INDEX IF NOT EXISTS idx_spec_proposal_changes_proposal
		ON spec_proposal_changes (proposal_id, sort_order);
	`);
}
