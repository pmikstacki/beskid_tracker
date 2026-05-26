/**
 * Writes data/v0.1–v0.3 from a git-history-derived catalog.
 * Run: bun run scripts/write-seed-catalog.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const seedRoot = path.join(root, "data");

type SeedBundle = {
	version: Record<string, unknown>;
	workstreams: Record<string, unknown>[];
	deliverables: Record<string, unknown>[];
	tasks: Record<string, unknown>[];
};

function writeBundle(versionId: string, bundle: SeedBundle) {
	const base = path.join(seedRoot, versionId);
	for (const sub of ["workstreams", "tasks", "deliverables"]) {
		fs.mkdirSync(path.join(base, sub), { recursive: true });
	}
	fs.writeFileSync(
		path.join(base, "version.json"),
		`${JSON.stringify(bundle.version, null, 2)}\n`,
	);
	for (const ws of bundle.workstreams) {
		fs.writeFileSync(
			path.join(base, "workstreams", `${ws.slug}.json`),
			`${JSON.stringify(ws, null, 2)}\n`,
		);
	}
	for (const deliverable of bundle.deliverables) {
		fs.writeFileSync(
			path.join(base, "deliverables", `${deliverable.id}.json`),
			`${JSON.stringify(deliverable, null, 2)}\n`,
		);
	}
	for (const task of bundle.tasks) {
		fs.writeFileSync(
			path.join(base, "tasks", `${task.id}.json`),
			`${JSON.stringify(task, null, 2)}\n`,
		);
	}
}

const v01: SeedBundle = {
	version: {
		id: "v0.1",
		title: "Compiler foundation",
		summary:
			"Establish the Rust compiler workspace, AOT packaging path, nested corelib submodule, and release/CI scaffolding.",
		theme: "setup compiler structure",
		status: "Released",
		cutoff: {
			startDate: "2026-03-05",
			endDate: "2026-04-22",
			startCommitSha: "dd75bff",
			endCommitSha: "f777b79",
			endCommitRepo: "beskid",
			rationale:
				"Spans compiler Initial Commit through superrepo tag v0.1.0 (Open VSX/site landing); ends before platform-spec cutover and analysis crate split.",
		},
	},
	workstreams: [
		{
			slug: "compiler-foundation",
			title: "Compiler workspace",
			summary: "Initial workspace, AOT refactor, pack command, module parity.",
			order: 1,
		},
		{
			slug: "corelib-packaging",
			title: "Corelib & pack",
			summary: "Nested corelib submodule, pack/CLI provisioning, stdlib embedding.",
			order: 2,
		},
		{
			slug: "ci-release",
			title: "CI & release",
			summary: "Nox-based CI, Open VSX publish flow, downloads site surfaces.",
			order: 3,
		},
	],
	deliverables: [
		{
			id: "v01-compiler-parity",
			title: "Compiler parity merge",
			number: 1,
			description: "compiler_parity PR merged with stdlib/runtime tests green.",
			closedOn: "2026-04-09",
		},
	],
	tasks: [
		{
			id: "compiler-initial-commit",
			number: 101,
			title: "Bootstrap compiler repository",
			statusColumn: "Done",
			priority: "high",
			workstream: "compiler-foundation",
			domain: "compiler",
			completedAt: "2026-03-05",
			deliverableId: "v01-compiler-parity",
			source: {
				repo: "compiler",
				commit: "dd75bff",
				subject: "Initial Commit",
			},
		},
		{
			id: "aot-refactor",
			number: 102,
			title: "AOT refactor baseline",
			statusColumn: "Done",
			priority: "high",
			workstream: "compiler-foundation",
			domain: "compiler",
			completedAt: "2026-03-17",
			deliverableId: "v01-compiler-parity",
			source: {
				repo: "compiler",
				commit: "8079b2e",
				subject: "AOT Refactor",
			},
		},
		{
			id: "pack-command",
			number: 103,
			title: "Pack command and package metadata",
			statusColumn: "Done",
			priority: "high",
			workstream: "corelib-packaging",
			domain: "tooling",
			completedAt: "2026-03-18",
			deliverableId: "v01-compiler-parity",
			source: {
				repo: "compiler",
				commit: "a0b7dbb",
				subject: "Pack command",
			},
		},
		{
			id: "compiler-parity-merge",
			number: 104,
			title: "Finalize compiler parity and stdlib/runtime tests",
			statusColumn: "Done",
			priority: "high",
			workstream: "compiler-foundation",
			domain: "compiler",
			completedAt: "2026-04-09",
			deliverableId: "v01-compiler-parity",
			source: {
				repo: "compiler",
				commit: "1f8d62d",
				subject: "Finalize compiler parity and stdlib/runtime test updates",
			},
		},
		{
			id: "corelib-submodule",
			number: 105,
			title: "Embed corelib via nested submodule for standalone CI",
			statusColumn: "Done",
			priority: "high",
			workstream: "corelib-packaging",
			domain: "core-library",
			completedAt: "2026-04-10",
			source: {
				repo: "compiler",
				commit: "3552572",
				subject: "fix: embed stdlib for standalone CI; add corelib submodule",
			},
		},
		{
			id: "ci-nox-migration",
			number: 106,
			title: "Move GitHub Actions logic to Nox helpers",
			statusColumn: "Done",
			priority: "medium",
			workstream: "ci-release",
			domain: "tooling",
			completedAt: "2026-04-13",
			source: {
				repo: "compiler",
				commit: "de48f22",
				subject: "ci: move GitHub Actions logic to Nox and Python helpers",
			},
		},
		{
			id: "file-scoped-modules",
			number: 107,
			title: "File-scoped module rules and resolver compatibility",
			statusColumn: "Done",
			priority: "high",
			workstream: "compiler-foundation",
			domain: "language-meta",
			area: "modules",
			completedAt: "2026-04-22",
			specRelations: [
				{
					path: "/platform-spec/language-meta/modules/file-scoped-modules",
					title: "File-scoped modules",
					level: "feature",
					relation: "implements",
					required: true,
				},
			],
			source: {
				repo: "compiler",
				commit: "2e4f445",
				subject: "feat: add file-scoped module rules and diagnostics",
			},
		},
		{
			id: "pckg-onboarding",
			number: 108,
			title: "pckg interactive first-run onboarding",
			statusColumn: "Done",
			priority: "medium",
			workstream: "corelib-packaging",
			domain: "tooling",
			completedAt: "2026-04-22",
			source: {
				repo: "pckg",
				commit: "1402410",
				subject: "feat: interactive first-run onboarding and migration service",
			},
		},
		{
			id: "site-landing-downloads",
			number: 109,
			title: "Redesign docs landing and downloads surfaces",
			statusColumn: "Done",
			priority: "medium",
			workstream: "ci-release",
			completedAt: "2026-04-22",
			source: {
				repo: "beskid",
				commit: "c92d17d",
				subject: "site: redesign landing and downloads surfaces",
			},
		},
		{
			id: "open-vsx-publish",
			number: 110,
			title: "Open VSX publish workflow on main",
			statusColumn: "Done",
			priority: "medium",
			workstream: "ci-release",
			completedAt: "2026-04-22",
			deliverableId: "v01-compiler-parity",
			source: {
				repo: "beskid",
				commit: "f777b79",
				subject: "fix(ci): avoid Windows decode crash in Open VSX namespace check",
			},
		},
	],
};

const v02: SeedBundle = {
	version: {
		id: "v0.2",
		title: "Analysis, packages, and platform spec",
		summary:
			"Typed analysis/doc pipeline, structured api.json in pckg, platform-spec cutover on beskid-lang.org, and workspace/LSP project graph.",
		theme: "analysis stack, packages, spec",
		status: "Released",
		cutoff: {
			startDate: "2026-04-23",
			endDate: "2026-05-22",
			startCommitSha: "f777b79",
			endCommitSha: "f57377a",
			endCommitRepo: "beskid",
			rationale:
				"Starts after v0.1.0; covers platform-spec consolidation (May 6), pipeline/services split (May 11), macro/HIR work (May 20), and pre-v0.3 merge tip.",
		},
	},
	workstreams: [
		{
			slug: "analysis-pipeline",
			title: "Analysis & pipeline",
			summary: "Pipeline crate, services split, api.json doc snapshots, macro expand.",
			order: 1,
		},
		{
			slug: "platform-spec",
			title: "Platform specification",
			summary: "Normative platform-spec tree, ADRs, trudoc verification on site.",
			order: 2,
		},
		{
			slug: "pckg-registry",
			title: "Package registry",
			summary: "Structured api.json publish/read paths and docs UI in pckg.",
			order: 3,
		},
		{
			slug: "docs-site",
			title: "Docs site",
			summary: "Book tutorial, platform-spec reader chrome, registry API reference pages.",
			order: 4,
		},
	],
	deliverables: [
		{
			id: "v02-platform-spec-cutover",
			title: "Platform-spec cutover",
			number: 2,
			closedOn: "2026-05-06",
		},
		{
			id: "v02-api-json-contract",
			title: "api.json primary contract",
			number: 3,
			closedOn: "2026-05-20",
		},
	],
	tasks: [
		{
			id: "platform-spec-cutover",
			number: 201,
			title: "Consolidate platform-spec and stabilize website container build",
			statusColumn: "Done",
			priority: "high",
			workstream: "platform-spec",
			domain: "community",
			completedAt: "2026-05-06",
			deliverableId: "v02-platform-spec-cutover",
			specRelations: [
				{
					path: "/platform-spec/",
					title: "Platform specification",
					level: "domain",
					relation: "tracks",
					required: true,
				},
			],
			source: {
				repo: "beskid",
				commit: "19745d4",
				subject:
					"consolidate platform-spec cutover and stabilize website container build",
			},
		},
		{
			id: "pipeline-crate-split",
			number: 202,
			title: "Pipeline crate and compiler services split",
			statusColumn: "Done",
			priority: "high",
			workstream: "analysis-pipeline",
			domain: "compiler",
			area: "pipeline",
			completedAt: "2026-05-11",
			deliverableId: "v02-platform-spec-cutover",
			source: {
				repo: "compiler",
				commit: "2cd54c5",
				subject:
					"Compiler: array type lowering, services split, pipeline crate, rustdoc sweep, Mod SDK regen.",
			},
		},
		{
			id: "platform-spec-expansion",
			number: 203,
			title: "Expand platform-spec pages and doc feedback guides",
			statusColumn: "Done",
			priority: "medium",
			workstream: "platform-spec",
			domain: "community",
			completedAt: "2026-05-09",
			source: {
				repo: "beskid",
				commit: "d25aa7a",
				subject: "docs(site): expand platform-spec pages and doc feedback guides",
			},
		},
		{
			id: "api-doc-snapshot",
			number: 204,
			title: "Structured API doc snapshot in analysis",
			statusColumn: "Done",
			priority: "high",
			workstream: "analysis-pipeline",
			domain: "compiler",
			area: "documentation",
			completedAt: "2026-05-18",
			deliverableId: "v02-api-json-contract",
			source: {
				repo: "compiler",
				commit: "5ff3d07",
				subject:
					"feat(analysis): structured API doc snapshot and registry doc pipeline",
			},
		},
		{
			id: "macro-registry",
			number: 205,
			title: "Macro registry, substitution, and HIR wiring",
			statusColumn: "Done",
			priority: "high",
			workstream: "analysis-pipeline",
			domain: "language-meta",
			area: "macros",
			completedAt: "2026-05-20",
			specRelations: [
				{
					path: "/platform-spec/language-meta/macros/",
					title: "Macros",
					level: "area",
					relation: "implements",
					required: true,
				},
			],
			source: {
				repo: "compiler",
				commit: "9f668d4",
				subject:
					"feat(compiler): macro registry, substitution, and HIR/format wiring",
			},
		},
		{
			id: "composition-assembly",
			number: 206,
			title: "Program assembly, front-end split, scheduler refactor",
			statusColumn: "Done",
			priority: "high",
			workstream: "analysis-pipeline",
			domain: "compiler",
			area: "composition",
			completedAt: "2026-05-20",
			source: {
				repo: "compiler",
				commit: "76a58f5",
				subject:
					"feat(compiler): program assembly, front-end split, and scheduler refactor",
			},
		},
		{
			id: "pckg-api-json-ui",
			number: 207,
			title: "pckg structured api.json docs UI",
			statusColumn: "Done",
			priority: "high",
			workstream: "pckg-registry",
			domain: "tooling",
			completedAt: "2026-05-20",
			deliverableId: "v02-api-json-contract",
			source: {
				repo: "pckg",
				commit: "2c0be25",
				subject: "feat(pckg): structured api.json docs UI and readonly source editor",
			},
		},
		{
			id: "api-json-publish-gate",
			number: 208,
			title: "Require structured api.json on package publish",
			statusColumn: "Done",
			priority: "high",
			workstream: "pckg-registry",
			completedAt: "2026-05-20",
			deliverableId: "v02-api-json-contract",
			source: {
				repo: "pckg",
				commit: "b8e1500",
				subject:
					"Require structured api.json on publish and improve package docs UX.",
			},
		},
		{
			id: "spec-api-json-tree",
			number: 209,
			title: "Platform spec: api.json library tree documentation",
			statusColumn: "Done",
			priority: "medium",
			workstream: "docs-site",
			domain: "tooling",
			completedAt: "2026-05-20",
			source: {
				repo: "beskid",
				commit: "af673dc",
				subject:
					"docs(spec): api.json library tree; bump compiler and pckg for API reference UI",
			},
		},
		{
			id: "platform-spec-mods-fibers",
			number: 210,
			title: "Restructure platform-spec: mods, fibers, terminal/console",
			statusColumn: "Done",
			priority: "medium",
			workstream: "platform-spec",
			completedAt: "2026-05-20",
			source: {
				repo: "beskid",
				commit: "ac8b574",
				subject:
					"docs(platform-spec): restructure compiler mods, fibers, and terminal/console",
			},
		},
		{
			id: "lsp-project-graph",
			number: 211,
			title: "LSP project explorer and project graph pipeline",
			statusColumn: "Done",
			priority: "high",
			workstream: "analysis-pipeline",
			domain: "tooling",
			completedAt: "2026-05-22",
			source: {
				repo: "compiler",
				commit: "6ae272b",
				subject:
					"feat: workspace templates, LSP project explorer, and project graph pipeline",
			},
		},
		{
			id: "book-tutorial-adrs",
			number: 212,
			title: "Book tutorial, platform-spec ADRs, trudoc routing",
			statusColumn: "Done",
			priority: "medium",
			workstream: "docs-site",
			completedAt: "2026-05-22",
			source: {
				repo: "beskid",
				commit: "e16bd3a",
				subject:
					"docs(site): book tutorial, platform-spec ADRs, trudoc, and docs routing",
			},
		},
	],
};

const v03: SeedBundle = {
	version: {
		id: "v0.3",
		title: "Macros, concurrency, and stabilization",
		summary:
			"v0.3 merge tracks: export FFI, runtime GC phase B, compiler mods, foreign lib import, corelib tiering, tool packageKind, and CLI LSP.",
		theme: "macros, concurrency, stabilization, etc.",
		status: "In Progress",
		cutoff: {
			startDate: "2026-05-23",
			endDate: "2026-05-25",
			startCommitSha: "83c57a7",
			endCommitSha: "aaddd32",
			endCommitRepo: "beskid",
			rationale:
				"Superrepo v0.3 merge wave (May 23) through current main; includes runtime/FFI stabilization and beskid lsp subcommand.",
		},
	},
	workstreams: [
		{
			slug: "ffi-export",
			title: "Export FFI & dynamic types",
			summary: "AotBuildRequest link libraries, ABI allowlists, export traceability.",
			order: 1,
		},
		{
			slug: "concurrency-runtime",
			title: "Concurrency & runtime",
			summary: "Runtime phase B GC, composition lowering, channel/preempt symbols.",
			order: 2,
		},
		{
			slug: "compiler-mods",
			title: "Compiler mods & imports",
			summary: "Mod host bridge, external libraries, beskid import lib CLI.",
			order: 3,
		},
		{
			slug: "stabilization",
			title: "Stabilization & tooling",
			summary: "Corelib tiering, tool packageKind, LSP subcommand, docs/CI hardening.",
			order: 4,
		},
	],
	deliverables: [
		{
			id: "v03-merge-wave",
			title: "v0.3 superrepo merge wave",
			number: 4,
			closedOn: "2026-05-23",
		},
		{
			id: "v03-verify-main",
			title: "verify-all-on-main evidence",
			number: 5,
			closedOn: "2026-05-24",
		},
	],
	tasks: [
		{
			id: "merge-compiler-mod-execution",
			number: 301,
			title: "Merge compiler-mod-execution into main",
			statusColumn: "Done",
			priority: "high",
			workstream: "compiler-mods",
			domain: "compiler",
			completedAt: "2026-05-23",
			deliverableId: "v03-merge-wave",
			source: {
				repo: "beskid",
				commit: "bf03401",
				subject: "merge(v0.3): compiler-mod-execution into main",
			},
		},
		{
			id: "foreign-lib-import",
			number: 302,
			title: "beskid import lib + ExternalLibrary registry",
			statusColumn: "Done",
			priority: "high",
			workstream: "compiler-mods",
			domain: "language-meta",
			area: "interop",
			completedAt: "2026-05-23",
			deliverableId: "v03-merge-wave",
			specRelations: [
				{
					path: "/platform-spec/language-meta/interop/foreign-libraries",
					title: "Foreign libraries",
					level: "feature",
					relation: "implements",
					required: true,
				},
			],
			source: {
				repo: "beskid",
				commit: "a150be3",
				subject:
					"feat(spec,compiler): beskid import lib + ExternalLibrary closed registry (v0.3)",
			},
		},
		{
			id: "native-di-codegen",
			number: 303,
			title: "Native DI codegen/runtime end-to-end",
			statusColumn: "Done",
			priority: "high",
			workstream: "compiler-mods",
			completedAt: "2026-05-23",
			deliverableId: "v03-merge-wave",
			source: {
				repo: "beskid",
				commit: "8260a4a",
				subject: "feat(v0.3): native DI codegen/runtime end-to-end (A2)",
			},
		},
		{
			id: "runtime-gc-phase-b",
			number: 304,
			title: "Runtime phase B GC opt-in",
			statusColumn: "Done",
			priority: "high",
			workstream: "concurrency-runtime",
			domain: "execution",
			completedAt: "2026-05-23",
			source: {
				repo: "compiler",
				commit: "1a85cee",
				subject:
					"runtime: phase B GC opt-in (multi-mutator, pointer channels, syscall-pool guard)",
			},
		},
		{
			id: "composition-lowering",
			number: 305,
			title: "Runtime container + codegen lowering for launch/with",
			statusColumn: "Done",
			priority: "high",
			workstream: "concurrency-runtime",
			domain: "execution",
			completedAt: "2026-05-23",
			source: {
				repo: "compiler",
				commit: "052d6e2",
				subject:
					"feat(composition): runtime container, ABI builtins, and codegen lowering for launch/with",
			},
		},
		{
			id: "corelib-tiering",
			number: 306,
			title: "Corelib tiering collections & api-shape",
			statusColumn: "Done",
			priority: "high",
			workstream: "stabilization",
			domain: "core-library",
			completedAt: "2026-05-23",
			deliverableId: "v03-merge-wave",
			source: {
				repo: "beskid",
				commit: "3b51b53",
				subject:
					"merge(v0.3): corelib-tiering-collections-fs-api-shape into main (keep integrated submodule tips)",
			},
		},
		{
			id: "export-ffi",
			number: 307,
			title: "Export FFI, dynamic types, AotBuildRequest link libraries",
			statusColumn: "Done",
			priority: "high",
			workstream: "ffi-export",
			domain: "execution",
			completedAt: "2026-05-24",
			specRelations: [
				{
					path: "/platform-spec/execution/ffi/export-ffi",
					title: "Export FFI",
					level: "feature",
					relation: "implements",
					required: true,
				},
			],
			source: {
				repo: "compiler",
				commit: "5e91147",
				subject:
					"feat(v0.3): export FFI, dynamic types, and AotBuildRequest link libraries",
			},
		},
		{
			id: "tool-package-kind",
			number: 308,
			title: "packageKind tool profile + formatter spec (A8)",
			statusColumn: "Done",
			priority: "medium",
			workstream: "stabilization",
			domain: "tooling",
			completedAt: "2026-05-23",
			source: {
				repo: "beskid",
				commit: "057a100",
				subject:
					"feat(spec,pckg,compiler): packageKind tool Standard + formatter feature hub (A8)",
			},
		},
		{
			id: "pckg-tool-package-kind",
			number: 309,
			title: "pckg packageKind tool standardization",
			statusColumn: "Done",
			priority: "medium",
			workstream: "stabilization",
			completedAt: "2026-05-23",
			source: {
				repo: "pckg",
				commit: "38648a4",
				subject:
					"feat(server,ui,tests): packageKind tool standardization (D-TOOL-PCKG-0004)",
			},
		},
		{
			id: "ffi-ci-stabilization",
			number: 310,
			title: "FFI v0.3 tests and runtime bridge discovery fixes",
			statusColumn: "Done",
			priority: "high",
			workstream: "ffi-export",
			completedAt: "2026-05-24",
			deliverableId: "v03-verify-main",
			source: {
				repo: "compiler",
				commit: "f7361aa",
				subject:
					"fix(ci): Path import in ffi_v03 tests and runtime bridge discovery",
			},
		},
		{
			id: "dynamic-types-spec",
			number: 311,
			title: "Promote dynamic-types spec and export FFI traceability",
			statusColumn: "Done",
			priority: "medium",
			workstream: "ffi-export",
			completedAt: "2026-05-24",
			source: {
				repo: "beskid",
				commit: "8cffb33",
				subject:
					"feat(v0.3): bump compiler, promote dynamic-types spec, export FFI traceability",
			},
		},
		{
			id: "platform-spec-nav",
			number: 312,
			title: "Platform-spec header and nav drawer polish",
			statusColumn: "Done",
			priority: "low",
			workstream: "stabilization",
			completedAt: "2026-05-24",
			source: {
				repo: "beskid",
				commit: "d800062",
				subject:
					"feat(platform-spec): enhance SpecPageHeader and layout styles for improved navigation and responsiveness",
			},
		},
		{
			id: "verify-all-main",
			number: 313,
			title: "verify-all-on-main evidence for v0.3 completion",
			statusColumn: "Done",
			priority: "medium",
			workstream: "stabilization",
			completedAt: "2026-05-24",
			deliverableId: "v03-verify-main",
			source: {
				repo: "beskid",
				commit: "aba4331",
				subject: "docs(orchestrate): add verify-all-on-main evidence for v0.3 completion",
			},
		},
		{
			id: "beskid-lsp-subcommand",
			number: 314,
			title: "beskid lsp subcommand for editor stdio server",
			statusColumn: "Done",
			priority: "high",
			workstream: "stabilization",
			domain: "tooling",
			completedAt: "2026-05-25",
			source: {
				repo: "compiler",
				commit: "a86a6d6",
				subject: "feat(cli): add `beskid lsp` subcommand for editor stdio server",
			},
		},
		{
			id: "roadmap-labels-docs",
			number: 315,
			title: "Roadmap GitHub labels documentation",
			statusColumn: "Done",
			priority: "low",
			workstream: "stabilization",
			completedAt: "2026-05-25",
			source: {
				repo: "beskid",
				commit: "be6ca5e",
				subject:
					"chore(docs): add roadmap labels documentation and update Dockerfiles for Bun versioning",
			},
		},
	],
};

fs.rmSync(seedRoot, { recursive: true, force: true });
for (const bundle of [v01, v02, v03]) {
	writeBundle(bundle.version.id as string, bundle);
}
console.log("Wrote seed data to", seedRoot);
