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
const docsUiRoot = path.dirname(require.resolve("@beskid/docs-ui/package.json"));
const docsUiSrc = path.join(docsUiRoot, "src");
/** ESM build — `yaml/dist/index.js` is CJS and breaks Vite SSR under Bun (`require is not defined`). */
const yamlEsm = path.resolve(rootDir, "node_modules/yaml/browser/index.js");

const resolveAlias = {
	"@beskid/docs-ui": docsUiSrc,
	"@beskid/material-theme": path.join(docsUiSrc, "styles/theme.material.css"),
	yaml: yamlEsm,
};

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
