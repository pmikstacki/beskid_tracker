import type { Octokit } from "@octokit/rest";
import { ensureVersionMilestone } from "#/lib/github/milestones-service";
import { repoParams } from "#/lib/github/octokit";
import { createSuperrepoVersionTags } from "#/lib/github/version-release";
import type { ParsedSeedBundle } from "#/lib/seed/parse-uploaded-bundle";
import { roadmapTaskToIssuePayload } from "#/lib/seed/roadmap-task-to-issue-payload";
import { seedTaskToRoadmapTask } from "#/lib/seed/to-roadmap-task";
import {
	findStoredIssueNumberBySeedId,
	persistGithubIssue,
	recomputeSyncStateFromStore,
	upsertGithubIssues,
} from "#/lib/storage/issues-repository";
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
	tagsCreated: number;
	tagsPlanned: number;
	tagsSkipped: number;
	tagErrors: string[];
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
		milestoneNumber: number;
		state: "open" | "closed";
		issueNumber?: number;
	};

	const pending: PendingPush[] = [];
	const milestoneByVersion = new Map<string, number>();

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

			const existingIssueNumber = findStoredIssueNumberBySeedId(task.id);
			const roadmapTask = seedTaskToRoadmapTask(
				bundle.version,
				task,
				deliverableMap,
				existingIssueNumber ?? 0,
			);
			const body = bodyWithSeedId(roadmapTask.body, task.id);

			if (options?.dryRun) {
				run.log(
					`[dry-run] ${existingIssueNumber ? `#${existingIssueNumber}` : "create"} — ${roadmapTask.title} (${task.id})`,
				);
				if (existingIssueNumber) updated += 1;
				else created += 1;
				continue;
			}

			let milestoneNumber = milestoneByVersion.get(bundle.versionId);
			if (milestoneNumber === undefined) {
				const milestone = await ensureVersionMilestone(
					octokit,
					bundle.versionId,
				);
				milestoneNumber = milestone.number;
				milestoneByVersion.set(bundle.versionId, milestoneNumber);
			}

			const state =
				roadmapTask.statusColumn === "Done" ? "closed" : ("open" as const);
			const milestone = { title: bundle.versionId, number: milestoneNumber };

			pending.push({
				task,
				roadmapTask: {
					...roadmapTask,
					body,
					milestone,
					number: existingIssueNumber ?? roadmapTask.number,
				},
				title: roadmapTask.title,
				body,
				labels: roadmapTask.labelNames,
				milestoneNumber,
				state,
				issueNumber: existingIssueNumber,
			});
		}
	}

	if (!options?.dryRun && pending.length > 0) {
		run.setPhase("Writing local cache (DB first)");
		const localPayloads = pending.map(({ roadmapTask, state }) =>
			roadmapTaskToIssuePayload(roadmapTask, { state }),
		);
		upsertGithubIssues(localPayloads);
		run.log(
			`Cached ${localPayloads.length} issue(s) locally before GitHub push`,
		);

		run.setPhase("Pushing to GitHub");
		let pushIndex = 0;

		for (const item of pending) {
			pushIndex += 1;
			run.setProgress(pushIndex, pending.length);

			const { task, title, body, labels, milestoneNumber, state, issueNumber } =
				item;

			try {
				if (issueNumber !== undefined) {
					await octokit.rest.issues.update({
						...repoParams(),
						issue_number: issueNumber,
						title,
						body,
						state,
						milestone: milestoneNumber,
					});
					await octokit.rest.issues.setLabels({
						...repoParams(),
						issue_number: issueNumber,
						labels,
					});
					const { data } = await octokit.rest.issues.get({
						...repoParams(),
						issue_number: issueNumber,
					});
					persistGithubIssue(data);
					updated += 1;
					run.log(`Updated #${issueNumber}: ${title}`);
				} else {
					const { data } = await octokit.rest.issues.create({
						...repoParams(),
						title,
						body,
						labels,
						milestone: milestoneNumber,
						state,
					});
					persistGithubIssue(data);
					run.log(`Created #${data.number}: ${title} (${task.id})`);
					created += 1;
				}
			} catch (error) {
				const message =
					error instanceof Error ? error.message : `Failed on task ${task.id}`;
				errors.push(`${task.id}: ${message}`);
				run.log(message, "error");
				skipped += 1;
			}
		}
	}

	const tagResult = await createSuperrepoVersionTags(
		octokit,
		bundles.map((bundle) => bundle.version),
		run,
		{ dryRun: options?.dryRun },
	);

	if (!options?.dryRun) {
		recomputeSyncStateFromStore();
	}

	const tagSummary = options?.dryRun
		? `${tagResult.planned} tag(s) planned`
		: `${tagResult.created} tag(s) created`;

	const summary =
		`Import finished: ${created} created, ${updated} updated, ${skipped} skipped, ${errors.length} issue error(s); ` +
		`${tagSummary}, ${tagResult.skipped} tag(s) skipped, ${tagResult.errors.length} tag error(s)`;
	run.complete(summary);

	return {
		created,
		updated,
		skipped,
		errors,
		runId: run.id,
		tagsCreated: tagResult.created,
		tagsPlanned: tagResult.planned,
		tagsSkipped: tagResult.skipped,
		tagErrors: tagResult.errors,
	};
}
