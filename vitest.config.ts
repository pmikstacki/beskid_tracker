import { defineConfig } from "vitest/config";

const uiComponents = new URL(
	"../beskid_web_common/packages/beskid-ui-react/src/components/ui",
	import.meta.url,
).pathname;

export default defineConfig({
	test: {
		environment: "node",
		include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
	},
	resolve: {
		alias: [
			{ find: "#/components/ui", replacement: uiComponents },
			{ find: "#", replacement: new URL("./src", import.meta.url).pathname },
			{
				find: /^trudoc\/(.+)$/,
				replacement: "@cyber-nomad-collective/trudoc/$1",
			},
		],
	},
});
