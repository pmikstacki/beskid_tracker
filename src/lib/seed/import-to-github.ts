import type { Octokit } from "@octokit/rest";

import { repoParams } from "#/lib/github/octokit";
import { registerVersionLabel } from "#/lib/github/issues-service";
import {
	getStoredIssue,
	persistGithubIssue,
	recomputeSyncStateFromStore,
	upsertGithubIssues,
} from "#/lib/storage/issues-repository";
import type { ParsedSeedBundle } from "#/lib/seed/parse-uploaded-bundle";
import { roadmapTaskToIssuePayload } from "#/lib/seed/roadmap-task-to-issue-payload";
import { seedTaskToRoadmapTask } from "#/lib/seed/to-roadmap-task";
import type { SyncRunHandle } from "#/lib/sync/sync-run-repository";

const SEED_ID_MARKER = "tracker-seed-id:";

export function seedIdMarker(taskId: string): string {
	return `<!-- ${SEED_ID_MARKER}${taskId} -->`;
}

function bodyWithSeedId(body: string, taskId: string): string {
	const marker = seedIdMarker(taskId);
	return body.includes(marker) ? body : `${body}\n\n${marker}`;
}

export interface SeedImportResult {
	created: number;
	updated: number;
	skipped: number;
	errors: string[];
	runId: string;
}

export async function importSeedBundlesToGitHub(
	octokit: Octokit,
	bundles: ParsedSeedBundle[],
	run: SyncRunHandle,
	options?: { dryRun?: boolean },
): Promise<SeedImportResult> {
	let created = 0;
	let updated = 0;
	let skipped = 0;
	const errors: string[] = [];

	const totalTasks = bundles.reduce((sum, b) => sum + b.tasks.length, 0);
	let processed = 0;
	run.setProgress(0, totalTasks);

	type PendingPush = {
		task: ParsedSeedBundle["tasks"][number];
		roadmapTask: ReturnType<typeof seedTaskToRoadmapTask>;
		title: string;
		body: string;
		labels: string[];
		existedInCache: boolean;
	};

	const pending: PendingPush[] = [];

	for (const bundle of bundles) {
		run.setPhase(`Version ${bundle.versionId}`);
		run.log(
			`${bundle.versionId}: ${bundle.tasks.length} tasks, ${bundle.workstreams.length} workstreams`,
		);

		const deliverableMap = new Map(
			bundle.deliverables.map((deliverable) => [deliverable.id, deliverable]),
		);

		for (const task of bundle.tasks) {
			processed += 1;
			run.setProgress(processed, totalTasks);

			const roadmapTask = seedTaskToRoadmapTask(
				bundle.version,
				task,
				deliverableMap,
			);
			const body = bodyWithSeedId(roadmapTask.body, task.id);
			const existedInCache = Boolean(getStoredIssue(task.number));

			if (options?.dryRun) {
				run.log(
					`[dry-run] #${task.number} ${existedInCache ? "update" : "create"} — ${roadmapTask.title}`,
				);
				if (existedInCache) updated += 1;
				else created += 1;
				continue;
			}

			pending.push({
				task,
				roadmapTask: { ...roadmapTask, body },
				title: roadmapTask.title,
				body,
				labels: roadmapTask.labelNames,
				existedInCache,
			});
		}
	}

	if (!options?.dryRun && pending.length > 0) {
		run.setPhase("Writing local cache (DB first)");
		const localPayloads = pending.map(({ roadmapTask }) =>
			roadmapTaskToIssuePayload(roadmapTask),
		);
		upsertGithubIssues(localPayloads);
		run.log(`Cached ${localPayloads.length} issue(s) locally before GitHub push`);

		for (const bundle of bundles) {
			await registerVersionLabel(octokit, bundle.versionId);
		}

		run.setPhase("Pushing to GitHub");
		let pushIndex = 0;

		for (const item of pending) {
			pushIndex += 1;
			run.setProgress(pushIndex, pending.length);

			const { task, title, body, labels, existedInCache } = item;

			try {
				if (existedInCache) {
					await octokit.rest.issues.update({
						...repoParams(),
						issue_number: task.number,
						title,
						body,
					});
					await octokit.rest.issues.setLabels({
						...repoParams(),
						issue_number: task.number,
						labels,
					});
					const { data } = await octokit.rest.issues.get({
						...repoParams(),
						issue_number: task.number,
					});
					persistGithubIssue(data);
					updated += 1;
					run.log(`Updated #${task.number}: ${title}`);
				} else {
					const { data } = await octokit.rest.issues.create({
						...repoParams(),
						title,
						body,
						labels,
					});
					persistGithubIssue(data);
					if (data.number !== task.number) {
						run.log(
							`Created #${data.number} for seed #${task.number} (${task.id}) — numbers differ`,
							"warn",
						);
					} else {
						run.log(`Created #${data.number}: ${title}`);
					}
					created += 1;
				}
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: `Failed on task ${task.id}`;
				errors.push(`#${task.number} ${task.id}: ${message}`);
				run.log(message, "error");
				skipped += 1;
			}
		}
	}

	if (!options?.dryRun) {
		recomputeSyncStateFromStore();
	}

	const summary = `Import finished: ${created} created, ${updated} updated, ${skipped} skipped, ${errors.length} errors`;
	run.complete(summary);

	return { created, updated, skipped, errors, runId: run.id };
}
