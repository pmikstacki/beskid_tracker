import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		AUTH_HUB_PUBLIC_URL: z.string().url(),
		SESSION_SECRET: z.string().min(32),
		GITHUB_REPO_OWNER: z.string().min(1).default("Cyber-Nomad-Collective"),
		GITHUB_REPO_NAME: z.string().min(1).default("beskid"),
		/** Legacy: prefer pairing-stored service token. */
		AUTH_HUB_SECRET: z.string().min(32).optional(),
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
		AUTH_HUB_PUBLIC_URL: process.env.AUTH_HUB_PUBLIC_URL,
		SESSION_SECRET: process.env.SESSION_SECRET,
		GITHUB_REPO_OWNER: process.env.GITHUB_REPO_OWNER,
		GITHUB_REPO_NAME: process.env.GITHUB_REPO_NAME,
		AUTH_HUB_SECRET: process.env.AUTH_HUB_SECRET,
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
