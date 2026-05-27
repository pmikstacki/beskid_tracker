# v0.4 — Platform services, auth, and delivery tooling

**Cutoff window:** 2026-05-26 through 2026-05-27 · superrepo `aaddd32` → `c8e5fc4` (`beskid`)

v0.4 opens immediately after the **truncated v0.3** release at `aaddd32`. Scope shifts from compiler macro/concurrency stabilization to **platform-facing services**: centralized OAuth (`site/auth`), shared frontend packages in `beskid_web_common`, the **beskid_tracker** roadmap product, **beskid_nexus** as a deployable knowledge graph, and **superrepo CI/CD** that keeps docs, tracker, nexus, and web workspaces green on Bun 1.3.14.

## Narrative (26–27 May)

| Day | Theme | Anchor commits |
|-----|-------|----------------|
| **26 May** | Superrepo structure + docs hub | `6438ae8` tracker/manifests/hub; `1e73032` `<beskid-hub>` + platform-spec catalog; `a49d2e9` trudoc/docs-ui → `beskid_web_common`; `72698c7` nexus submodule; `1b0a15c` web workspace CI |
| **26 May** | Nexus CI + hosting | `b37a9c2`–`87da140` Ladybug/native Docker CI; `eb2aa21` service hosting model; `5777116` CICD fixes |
| **26–27 May** | Auth + tracker product | `510f302`–`bed2192` auth hub + tracker fixes; `bbd6366` nexus Coolify hosting; `4fde6e0` lazygit recursive commit/push |
| **27 May** | Toolchain hygiene | `f40ecb3` bun.lock alignment; `c8e5fc4` bsharp `update=none` |

## Deliverable map

| Deliverable | Focus | Status (seed) |
|-------------|-------|---------------|
| **v04-platform-dx** | Hub, redirects, hosting model, Coolify multi-app | Partial — hub/redirects landed |
| **v04-cicd-realized** | Web CI action, trudoc paths, nexus smoke, verify-all | Partial — CI landed, verify-all backlog |
| **v04-tracker-ship** | Submodule, seed catalog, auth integration, production mirror | In progress |
| **v04-nexus-operational** | Submodule, native CI, `gitnexus serve` hosting | In progress |
| **v04-corelib-complete** | Compiler bump; stub APIs remain | Backlog |
| **v04-vscode-pckg-docs** | pckg + platform-spec + docs in editor | Backlog |

## Workstreams

- **web-auth-web-common** — `site/auth` OAuth hub, `beskid_web_common` trudoc/docs-ui, shared `@beskid/beskid-ui`.
- **tracker-implementation** — Roadmap kanban, seed catalog, GitHub mirror/webhooks, auth handoff.
- **nexus** — `beskid_nexus` submodule, Ladybug graph CI, Coolify `gitnexus serve`.
- **repo-cicd** — Manifests, lazygit recursive push, treesitter, Bun lock, setup-environment cleanup.
- **compiler-corelib** — Quality bumps; full corelib stub replacement (planned).
- **vscode-editor** — pckg registry UX, spec/docs deep links, LSP bootstrap (planned).
- **platform-docs-dx** — Cross-app hub, legacy URLs, trudoc prebuild in web workspace.

## v0.3 carry-over

Items planned under v0.3 but **cut off** at `aaddd32` (not re-seeded here): late macro/mod polish, full verify-all closure for v0.3 scope, and completed LSP/editor items already in v0.3 seed. **tracker-local-dev-bootstrap** moves to v0.4 Backlog.

## Source axis

Seed tasks anchor to **`source.commit`** on the landing repo (`beskid` unless submodule-only). `In Progress` / `Backlog` tasks use the latest known superrepo tip (`c8e5fc4`) when work is ongoing without a final landing SHA.
