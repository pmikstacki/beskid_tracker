import type { RestEndpointMethodTypes } from "@octokit/rest";

export type GitHubIssuePayload =
	RestEndpointMethodTypes["issues"]["listForRepo"]["response"]["data"][number];

export function issuePayloadFromGithub(
	issue: GitHubIssuePayload,
): GitHubIssuePayload {
	return {
		number: issue.number,
		title: issue.title,
		body: issue.body,
		state: issue.state,
		html_url: issue.html_url,
		created_at: issue.created_at,
		pull_request: issue.pull_request,
		labels: issue.labels,
		user: issue.user,
		assignees: issue.assignees,
		milestone: issue.milestone,
	};
}

export function serializeIssuePayload(issue: GitHubIssuePayload): string {
	return JSON.stringify(issuePayloadFromGithub(issue));
}

export function parseIssuePayload(raw: string): GitHubIssuePayload {
	return JSON.parse(raw) as GitHubIssuePayload;
}
