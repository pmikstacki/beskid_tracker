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

export type GithubWebhookSecretSource = ReturnType<
	typeof getGithubWebhookSecretSource
>;

export {
	clearGithubWebhookSecretInDatabase,
	getGithubWebhookSecretFromEnv,
	setGithubWebhookSecretInDatabase,
	setTrackerPublicOrigin,
	provisionRepositoryIssuesWebhook,
};

export function buildGithubWebhookSettings() {
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
