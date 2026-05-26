/**
 * Validates all JSON under data/v0.x against Zod schemas.
 * Run: bun run scripts/validate-seed.ts
 */
import { loadAllVersionSeeds } from "#/lib/seed/load";

const bundles = loadAllVersionSeeds();
let tasks = 0;
let workstreams = 0;
let deliverables = 0;

for (const bundle of bundles) {
	workstreams += bundle.workstreams.length;
	deliverables += bundle.deliverables.length;
	tasks += bundle.tasks.length;
	console.log(
		`${bundle.version.id}: ${bundle.tasks.length} tasks, ${bundle.workstreams.length} workstreams, ${bundle.deliverables.length} deliverables`,
	);
}

console.log(
	`OK — ${bundles.length} versions, ${tasks} tasks, ${workstreams} workstreams, ${deliverables} deliverables`,
);
