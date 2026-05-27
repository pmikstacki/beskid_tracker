import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const beskidUiRoot = path.dirname(require.resolve("@beskid/beskid-ui/package.json"));
const beskidUiSrc = path.join(beskidUiRoot, "src");
const uiReactRoot = path.dirname(require.resolve("@beskid/ui-react/package.json"));
const uiReactSrc = path.join(uiReactRoot, "src");
/** ESM build — `yaml/dist/index.js` is CJS and breaks Vite SSR under Bun (`require is not defined`). */
const yamlEsm = path.resolve(rootDir, "node_modules/yaml/browser/index.js");
const trudocSrc = path.resolve(
	rootDir,
	"../beskid_web_common/packages/trudoc/src",
);

const resolveAlias = [
	{
		find: /^trudoc\/(.+)$/,
		replacement: `${trudocSrc}/$1`,
	},
	{ find: "@beskid/beskid-ui", replacement: beskidUiSrc },
	{
		find: "@beskid/material-theme",
		replacement: path.join(beskidUiSrc, "styles/theme.material.css"),
	},
	{ find: "#/components/ui", replacement: path.join(uiReactSrc, "components/ui") },
	{ find: "#/lib/utils.ts", replacement: path.join(uiReactSrc, "lib/utils.ts") },
	{ find: "#/lib/utils", replacement: path.join(uiReactSrc, "lib/utils.ts") },
	{
		find: "#/hooks/use-mobile.ts",
		replacement: path.join(uiReactSrc, "hooks/use-mobile.ts"),
	},
	{ find: "yaml", replacement: yamlEsm },
];

const config = defineConfig({
	resolve: {
		tsconfigPaths: true,
		alias: resolveAlias,
	},
	ssr: {
		resolve: {
			alias: resolveAlias,
		},
		noExternal: ["trudoc", "yaml"],
	},
	optimizeDeps: {
		include: ["yaml"],
	},
	plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
});

export default config;
