import "@tanstack/react-start/server-only";

import type { Database } from "bun:sqlite";

import { getIssuesDatabase } from "#/lib/storage/db";
import type { ParsedSeedBundle } from "#/lib/seed/parse-uploaded-bundle";
import { upsertTrackerVersion } from "#/lib/tracker/repositories/versions-repository";
import {
	upsertTrackerDeliverable,
	upsertTrackerTask,
	upsertTrackerWorkstream,
} from "#/lib/tracker/repositories/tasks-repository";

export interface CatalogImportSummary {
	versionsUpserted: number;
	workstreamsUpserted: number;
	deliverablesUpserted: number;
	tasksUpserted: number;
}

function upsertBundleInTransaction(
	db: Database,
	bundle: ParsedSeedBundle,
): CatalogImportSummary {
	const catalogRevisions = new Set(
		bundle.tasks.flatMap((task) =>
			task.specRelations.flatMap((relation) =>
				relation.catalogRevision ? [relation.catalogRevision] : [],
			),
		),
	);
	if (catalogRevisions.size > 1) {
		throw new Error(`Multiple catalog revisions for version ${bundle.versionId}`);
	}
	upsertTrackerVersion(db, bundle.version, {
		catalogRevision: catalogRevisions.values().next().value,
	});

	for (const workstream of bundle.workstreams) {
		upsertTrackerWorkstream(db, bundle.versionId, workstream);
	}

	for (const deliverable of bundle.deliverables) {
		upsertTrackerDeliverable(db, bundle.versionId, deliverable);
	}

	for (const task of bundle.tasks) {
		upsertTrackerTask(db, bundle.versionId, task);
	}

	return {
		versionsUpserted: 1,
		workstreamsUpserted: bundle.workstreams.length,
		deliverablesUpserted: bundle.deliverables.length,
		tasksUpserted: bundle.tasks.length,
	};
}

function mergeSummaries(
	accumulator: CatalogImportSummary,
	next: CatalogImportSummary,
): CatalogImportSummary {
	return {
		versionsUpserted: accumulator.versionsUpserted + next.versionsUpserted,
		workstreamsUpserted:
			accumulator.workstreamsUpserted + next.workstreamsUpserted,
		deliverablesUpserted:
			accumulator.deliverablesUpserted + next.deliverablesUpserted,
		tasksUpserted: accumulator.tasksUpserted + next.tasksUpserted,
	};
}

export function upsertParsedSeedBundle(
	bundle: ParsedSeedBundle,
	db?: Database,
): CatalogImportSummary {
	const database = db ?? getIssuesDatabase();
	const tx = database.transaction((input: ParsedSeedBundle) =>
		upsertBundleInTransaction(database, input),
	);
	return tx(bundle);
}

export function upsertParsedSeedBundles(
	bundles: ParsedSeedBundle[],
	db?: Database,
): CatalogImportSummary {
	const database = db ?? getIssuesDatabase();
	const tx = database.transaction((inputs: ParsedSeedBundle[]) => {
		let summary: CatalogImportSummary = {
			versionsUpserted: 0,
			workstreamsUpserted: 0,
			deliverablesUpserted: 0,
			tasksUpserted: 0,
		};
		for (const bundle of inputs) {
			summary = mergeSummaries(
				summary,
				upsertBundleInTransaction(database, bundle),
			);
		}
		return summary;
	});
	return tx(bundles);
}
