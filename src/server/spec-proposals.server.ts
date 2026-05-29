import type { Database } from "bun:sqlite";

import { getIssuesDatabase } from "#/lib/storage/db";
import * as proposalsRepository from "#/lib/storage/proposals-repository";

export type ProposalsRepository = typeof proposalsRepository;

export function withIssuesDb<T>(
	fn: (db: Database, repo: ProposalsRepository) => T,
): T {
	return fn(getIssuesDatabase(), proposalsRepository);
}
