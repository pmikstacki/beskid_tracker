import "@tanstack/react-start/server-only";

import type { Octokit } from "@octokit/rest";

import type { CreatePublicBugInput as GithubCreatePublicBugInput } from "#/lib/github/issues-service";
import type { PublicBug } from "#/lib/github/types";
import {
	createPublicBug,
	type CreatePublicBugInput,
} from "#/lib/tracker/bug-service";
import { drainGithubSyncOutbox } from "#/lib/tracker/process-outbox";

export async function createPublicBugForSession(
	octokit: Octokit,
	input: GithubCreatePublicBugInput & {
		componentId: string;
		subcomponentId: string;
	},
): Promise<PublicBug> {
	const bugInput: CreatePublicBugInput = {
		title: input.title,
		body: input.body,
		componentId: input.componentId,
		subcomponentId: input.subcomponentId,
	};

	const bug = await createPublicBug(bugInput);
	await drainGithubSyncOutbox(octokit).catch(() => undefined);
	return bug;
}
