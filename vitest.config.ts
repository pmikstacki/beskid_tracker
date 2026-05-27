import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		include: ["src/**/*.test.ts"],
	},
	resolve: {
		alias: [
			{ find: "#", replacement: new URL("./src", import.meta.url).pathname },
			{
				find: /^trudoc\/(.+)$/,
				replacement: "@cyber-nomad-collective/trudoc/$1",
			},
		],
	},
});
