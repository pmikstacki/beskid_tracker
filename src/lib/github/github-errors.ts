import { RequestError } from "@octokit/request-error";

export function isGitHubRateLimitError(error: unknown): boolean {
	if (!(error instanceof RequestError)) return false;
	if (error.status !== 403) return false;
	const message = error.message.toLowerCase();
	return (
		message.includes("rate limit") ||
		message.includes("api rate limit exceeded")
	);
}

export function githubErrorMessage(error: unknown): string {
	if (error instanceof RequestError) {
		if (isGitHubRateLimitError(error)) {
			return "GitHub API rate limit exceeded. Set GITHUB_PUBLIC_READ_TOKEN or sign in, then retry in a few minutes.";
		}
		return error.message;
	}
	if (error instanceof Error) return error.message;
	return "GitHub request failed";
}
