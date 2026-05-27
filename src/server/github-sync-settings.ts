import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { canManageRoadmap } from "#/lib/github/permissions";
import { readSyncState } from "#/lib/storage/issues-repository";
import {
	clearGithubWebhookSecretInDatabase,
	getGithubWebhookSecretFromEnv,
	getGithubWebhookSecretSource,
	githubRepoFullName,
	githubRepositoryNewWebhookUrl,
	githubRepositoryWebhooksUrl,
	githubWebhookUrl,
	isGithubSyncDisabled,
	isGithubWebhookConfigured,
	readGithubWebhookDeliveryMeta,
	resolveTrackerPublicOrigin,
	setGithubWebhookSecretInDatabase,
	setTrackerPublicOrigin,
} from "#/lib/sync/github-webhook-config";
import { provisionRepositoryIssuesWebhook } from "#/lib/sync/github-webhook-provision";

export interface GithubWebhookSettingsPayload {
	webhookUrl: string;
	publicOrigin: string;
	repoFullName: string;
	/** Opens GitHub’s “Add webhook” form for the configured repository. */
	githubNewWebhookUrl: string;
	/** Lists webhooks on the repository (verify or edit after API create). */
	githubWebhooksUrl: string;
	secretConfigured: boolean;
	secretSource: ReturnType<typeof getGithubWebhookSecretSource>;
	secretLockedByEnv: boolean;
	lastWebhookAt: string | null;
	lastWebhookAction: string | null;
	syncDisabled: boolean;
	lastBootstrapAt: string | null;
	openIssueCount: number;
}

export interface ProvisionGithubWebhookPayload {
	action: "created" | "updated";
	hookId: number;
	adminUrl: string;
	payloadUrl: string;
}

function buildGithubWebhookSettings(): GithubWebhookSettingsPayload {
	const delivery = readGithubWebhookDeliveryMeta();
	const state = readSyncState();

	return {
		webhookUrl: githubWebhookUrl(),
		publicOrigin: resolveTrackerPublicOrigin(),
		repoFullName: githubRepoFullName(),
		githubNewWebhookUrl: githubRepositoryNewWebhookUrl(),
		githubWebhooksUrl: githubRepositoryWebhooksUrl(),
		secretConfigured: isGithubWebhookConfigured(),
		secretSource: getGithubWebhookSecretSource(),
		secretLockedByEnv: Boolean(getGithubWebhookSecretFromEnv()),
		lastWebhookAt: delivery.lastAt,
		lastWebhookAction: delivery.lastAction,
		syncDisabled: isGithubSyncDisabled(),
		lastBootstrapAt: state.lastSuccessAt,
		openIssueCount: state.openIssueCount,
	};
}

async function requireMaintainer() {
	const { withOctokit, requireSession } = await import(
		"#/server/auth-guard.server"
	);
	const session = await requireSession();

	return withOctokit(async (octokit) => {
		if (!(await canManageRoadmap(octokit, session.login))) {
			throw new Error("Only repository maintainers can manage sync settings");
		}
		return session;
	});
}

export const getGithubWebhookSettingsFn = createServerFn({
	method: "GET",
}).handler(async (): Promise<GithubWebhookSettingsPayload> => {
	await requireMaintainer();
	return buildGithubWebhookSettings();
});

export const updateGithubWebhookSettingsFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			publicOrigin: z.string().url().optional(),
			webhookSecret: z
				.union([z.string().min(8).max(256), z.literal("")])
				.optional(),
		}),
	)
	.handler(async ({ data }): Promise<GithubWebhookSettingsPayload> => {
		await requireMaintainer();

		if (getGithubWebhookSecretFromEnv()) {
			throw new Error(
				"Webhook secret is set via GITHUB_WEBHOOK_SECRET in the environment and cannot be changed here",
			);
		}

		if (data.publicOrigin) {
			setTrackerPublicOrigin(data.publicOrigin);
		}

		if (data.webhookSecret !== undefined) {
			if (data.webhookSecret === "") {
				clearGithubWebhookSecretInDatabase();
			} else {
				setGithubWebhookSecretInDatabase(data.webhookSecret);
			}
		}

		return buildGithubWebhookSettings();
	});

export const provisionGithubWebhookFn = createServerFn({
	method: "POST",
}).handler(async (): Promise<ProvisionGithubWebhookPayload> => {
	const { withOctokit } = await import("#/server/auth-guard.server");
	await requireMaintainer();

	return withOctokit(async (octokit) =>
		provisionRepositoryIssuesWebhook(octokit),
	);
});
