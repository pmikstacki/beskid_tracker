import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const beskidUiRoot = path.dirname(
	require.resolve("@beskid/beskid-ui/package.json"),
);
const beskidUiSrc = path.join(beskidUiRoot, "src");
const uiReactRoot = path.dirname(
	require.resolve("@beskid/ui-react/package.json"),
);
const uiReactSrc = path.join(uiReactRoot, "src");
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
	plugins: [devtools(), tailwindcss(), tanstackStart(), nitro({ preset: "bun" }), viteReact()],
	resolve: {
		tsconfigPaths: true,
		alias: resolveAlias,
	},
	ssr: {
		noExternal: ["trudoc", "yaml"],
	},
	optimizeDeps: {
		include: ["yaml"],
	},
});

export default config;
