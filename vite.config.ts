import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

import { packageRoot, packageSrc } from "./vite.resolve-beskid-packages";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const uiReactLocal = path.resolve(
	rootDir,
	"../beskid_web_common/packages/beskid-ui-react",
);
const uiReactRoot = fs.existsSync(path.join(uiReactLocal, "package.json"))
	? uiReactLocal
	: packageRoot("@beskid/ui-react");
const uiReactSrc = path.join(uiReactRoot, "src");
const beskidUiSrc = packageSrc("@beskid/beskid-ui");
const authClientEntry = path.resolve(
	rootDir,
	"node_modules/@beskid/auth-client/src/index.ts",
);
/** ESM build — `yaml/dist/index.js` is CJS and breaks Vite SSR under Bun (`require is not defined`). */
const yamlEsm = path.resolve(rootDir, "node_modules/yaml/browser/index.js");
const trudocRoot = path.dirname(
	require.resolve("@cyber-nomad-collective/trudoc/package.json"),
);
const trudocSrc = path.join(trudocRoot, "src");

const resolveAlias = [
	{
		find: /^trudoc\/(.+)$/,
		replacement: `${trudocSrc}/$1`,
	},
	{ find: "@beskid/beskid-ui", replacement: beskidUiSrc },
	{
		find: "@beskid/ui-react/styles/shadcn-entry.css",
		replacement: path.join(uiReactRoot, "src/styles/shadcn-entry.css"),
	},
	{
		find: "@beskid/ui-react/settings",
		replacement: path.join(uiReactRoot, "src/components/settings/index.ts"),
	},
	{
		find: "@beskid/ui-react",
		replacement: path.join(uiReactRoot, "src/index.ts"),
	},
	{ find: "@beskid/auth-client", replacement: authClientEntry },
	{
		find: "@beskid/material-theme",
		replacement: path.join(beskidUiSrc, "styles/theme.material.css"),
	},
	{
		find: "#/components/ui",
		replacement: path.join(uiReactSrc, "components/ui"),
	},
	{
		find: "#/lib/utils.ts",
		replacement: path.join(uiReactSrc, "lib/utils.ts"),
	},
	{ find: "#/lib/utils", replacement: path.join(uiReactSrc, "lib/utils.ts") },
	{
		find: "#/hooks/use-mobile.ts",
		replacement: path.join(uiReactSrc, "hooks/use-mobile.ts"),
	},
	{ find: "yaml", replacement: yamlEsm },
];

const config = defineConfig({
	plugins: [
		devtools(),
		tailwindcss(),
		tanstackStart(),
		nitro({ preset: "bun" }),
		viteReact(),
	],
	resolve: {
		tsconfigPaths: true,
		alias: resolveAlias,
		dedupe: [
			"class-variance-authority",
			"clsx",
			"tailwind-merge",
			"radix-ui",
			"lucide-react",
			"next-themes",
			"sonner",
			"vaul",
			"cmdk",
			"react-day-picker",
			"react-resizable-panels",
			"embla-carousel-react",
			"recharts",
			"input-otp",
			"@base-ui/react",
			"jose",
		],
	},
	ssr: {
		noExternal: [
			"trudoc",
			"yaml",
			"@beskid/server-observability",
			"pino",
			"prom-client",
		],
		external: ["bun:sqlite", "node:fs", "node:path"],
	},
	optimizeDeps: {
		include: ["yaml"],
	},
});

export default config;
