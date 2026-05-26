import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		GITHUB_CLIENT_ID: z.string().min(1),
		GITHUB_CLIENT_SECRET: z.string().min(1),
		SESSION_SECRET: z.string().min(32),
		GITHUB_REPO_OWNER: z.string().min(1).default("Cyber-Nomad-Collective"),
		GITHUB_REPO_NAME: z.string().min(1).default("beskid"),
		GITHUB_OAUTH_CALLBACK_URL: z.string().url(),
		GITHUB_PUBLIC_READ_TOKEN: z.string().min(1).optional(),
		GITHUB_SYNC_TOKEN: z.string().min(1).optional(),
		TRACKER_DATA_DIR: z.string().min(1).optional(),
		TRACKER_PUBLIC_URL: z.string().url().optional(),
		GITHUB_WEBHOOK_SECRET: z.string().min(8).optional(),
		NODE_ENV: z.enum(["development", "production", "test"]).optional(),
	},
	clientPrefix: "VITE_",
	client: {
		VITE_GITHUB_REPO_DISPLAY_NAME: z.string().min(1).default("beskid"),
	},
	runtimeEnv: {
		GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
		GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
		SESSION_SECRET: process.env.SESSION_SECRET,
		GITHUB_REPO_OWNER: process.env.GITHUB_REPO_OWNER,
		GITHUB_REPO_NAME: process.env.GITHUB_REPO_NAME,
		GITHUB_OAUTH_CALLBACK_URL: process.env.GITHUB_OAUTH_CALLBACK_URL,
		GITHUB_PUBLIC_READ_TOKEN: process.env.GITHUB_PUBLIC_READ_TOKEN,
		GITHUB_SYNC_TOKEN: process.env.GITHUB_SYNC_TOKEN,
		TRACKER_DATA_DIR: process.env.TRACKER_DATA_DIR,
		TRACKER_PUBLIC_URL: process.env.TRACKER_PUBLIC_URL,
		GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET,
		NODE_ENV: process.env.NODE_ENV,
		VITE_GITHUB_REPO_DISPLAY_NAME: import.meta.env
			.VITE_GITHUB_REPO_DISPLAY_NAME,
	},
	emptyStringAsUndefined: true,
	skipValidation:
		process.env.SKIP_ENV_VALIDATION === "1" ||
		process.env.NODE_ENV !== "production",
});
