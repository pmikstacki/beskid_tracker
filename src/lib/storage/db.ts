import "@tanstack/react-start/server-only";

import { Database } from "bun:sqlite";

import { ensureTrackerDataDir, issuesDbPath } from "#/lib/storage/paths";
import { migrateSchema } from "#/lib/storage/schema";

let dbInstance: Database | null = null;

export function getIssuesDatabase(): Database {
	if (!dbInstance) {
		ensureTrackerDataDir();
		dbInstance = new Database(issuesDbPath(), { create: true });
		migrateSchema(dbInstance);
	}
	return dbInstance;
}

/** Test helper — closes the singleton between cases. */
export function closeIssuesDatabase(): void {
	dbInstance?.close();
	dbInstance = null;
}
