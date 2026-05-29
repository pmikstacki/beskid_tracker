import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

/** Resolve installed package root from node_modules (never monorepo workspace). */
export function packageRoot(specifier: string): string {
	const segments = specifier.split("/");
	const candidate = path.join(rootDir, "node_modules", ...segments);
	if (fs.existsSync(path.join(candidate, "package.json"))) {
		return candidate;
	}

	const entry = require.resolve(specifier);
	let dir = path.dirname(entry);
	while (dir !== path.dirname(dir)) {
		if (fs.existsSync(path.join(dir, "package.json"))) {
			return dir;
		}
		dir = path.dirname(dir);
	}

	throw new Error(
		`${specifier} is not installed. Run bun install (GitHub Packages: NODE_AUTH_TOKEN).`,
	);
}

export function packageSrc(specifier: string): string {
	return path.join(packageRoot(specifier), "src");
}
