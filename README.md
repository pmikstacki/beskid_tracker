# Beskid Tracker

[TanStack Start](https://tanstack.com/start) tracker and roadmap planner for the [Cyber-Nomad-Collective/beskid](https://github.com/Cyber-Nomad-Collective/beskid) superrepo. Public bug reports and the delivery timeline are version-agnostic; kanban boards are per delivery version. **GitHub Issues remain the source of truth** for creates and updates; the app mirrors open issues (and closed `bug`-labeled issues) in a local **SQLite** store and serves reads from that mirror so anonymous traffic does not hammer the GitHub REST API. Issue changes arrive via **GitHub webhooks** (no background REST polling). Configure the webhook on the **Settings** tab in the sync drawer, or set `GITHUB_WEBHOOK_SECRET` in the environment. Each issue belongs to a **delivery version** (`v0.1`–`v0.4`); the kanban board is per version. [Platform specification](https://beskid-lang.org/platform-spec/) nodes are linked with typed relations in issue bodies; the repo owner approves spec linkages.

## Stack

- TanStack Start + Router + Query
- GitHub OAuth + REST API (`@octokit/rest`) for auth, writes, and background sync
- SQLite issue mirror (`bun:sqlite`, default `data/runtime/issues.sqlite`)
- Encrypted session cookie (`jose`)
- Tailwind CSS v4, shadcn/ui (Radix Maia), ReUI Kanban

## Theming

Visual design follows **beskid-lang.org** and **pckg** Material teal tokens from [`packages/beskid-docs-ui/src/styles/theme.material.css`](../../packages/beskid-docs-ui/src/styles/theme.material.css):

- `src/styles/beskid-tokens.css` — imports shared brand variables
- `src/styles/shadcn-theme.css` — maps shadcn `--primary`, `--background`, etc. to those tokens
- `src/styles/roadmap-app.css` — app shell (header, kanban cards, typography)
- Theme toggle uses `data-theme` (`light` / `dark`) like the docs site (`next-themes`)

When updating site chrome, keep `shadcn-theme.css` in sync or extend shared tokens in docs-ui (`--beskid-material-seed`, `--beskid-fluent-accent`, `--beskid-fluent-neutral` in `theme.material.css`). **pckg** maps the same seed into Fluent UI Blazor via `FluentDesignTheme` / `loading-theme` `primary-color` and `neutral-color`.

## GitHub labels

Kanban columns and priorities use repository labels. See [docs/roadmap-labels.md](../docs/roadmap-labels.md) and run:

```bash
bash scripts/setup-github-labels.sh
```

## Environment

```bash
cp .env.example .env
```

`bun run dev` skips strict env validation in non-production; production and Docker runtime still require real values. Set:

| Variable | Purpose |
|----------|---------|
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | OAuth App credentials |
| `GITHUB_OAUTH_CALLBACK_URL` | e.g. `http://localhost:3000/api/auth/callback` |
| `SESSION_SECRET` | 32+ byte secret (`openssl rand -base64 32`) |
| `GITHUB_REPO_OWNER` / `GITHUB_REPO_NAME` | Default: `Cyber-Nomad-Collective` / `beskid` |
| `GITHUB_SYNC_TOKEN` | PAT for background issue sync (falls back to `GITHUB_PUBLIC_READ_TOKEN`) |
| `GITHUB_PUBLIC_READ_TOKEN` | Optional PAT used for sync when `GITHUB_SYNC_TOKEN` is unset |
| `TRACKER_DATA_DIR` | SQLite directory (default `data/runtime`) — mount as a volume in Docker |
| `GITHUB_WEBHOOK_SECRET` | Webhook HMAC secret (overrides Settings tab; optional in dev) |
| `TRACKER_PUBLIC_URL` | Public origin for webhook URL (optional; Settings tab can override) |
| `ISSUES_SYNC_DISABLED` | Set `1` to disable sync (read-only empty store) |
| *(none)* | Platform spec pages and nav JSON always use `https://beskid-lang.org` |

Create a GitHub OAuth App with callback URL matching `GITHUB_OAUTH_CALLBACK_URL` and scopes **`read:user`** and **`repo`** (or **`public_repo`** for a public repository).

## Commands

| Command | Action |
|---------|--------|
| `bun install` | Install dependencies |
| `bun run dev` | Dev server at http://localhost:3000 |
| `bun run build` | Production build (runs `prebuild` sync) |
| `bun run start` | Production server on port 3000 |
| `bun run check` | Biome lint/format |
| `bun run sync:issues` | Pull GitHub Issues into the local SQLite store |

## Docker

**Coolify** (recommended): base directory **`/beskid_tracker`**, compose file [`docker-compose.yml`](docker-compose.yml) or [`infra/docker-compose.yml`](infra/docker-compose.yml). See **[COOLIFY.md](COOLIFY.md)** for secrets, volumes, and submodule settings.

**Local smoke test** (superrepo root, same image as production):

```bash
docker compose -f beskid_tracker/docker-compose.yml up --build
# or: docker compose -f beskid_tracker/infra/docker-compose.yml up --build
```

**Local dev** (hot reload, not the production image):

```bash
cd beskid_tracker
cp .env.example .env
bun install
bun run dev
```

Optional: [`docker-compose.local.yml`](docker-compose.local.yml) from `beskid_tracker/` (maps port 3000, bind-mounts `data/runtime`). Requires running `docker compose` from the superrepo root so `context: ..` resolves correctly.

Runtime requires the same env vars as above (set in Coolify secrets). Register the production callback URL on the OAuth App (for example `https://tracker.beskid-lang.org/api/auth/callback`).

### Coolify secrets

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `SESSION_SECRET`
- `GITHUB_OAUTH_CALLBACK_URL` (public URL + `/api/auth/callback`)
- Optional: `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME`, `GITHUB_SYNC_TOKEN` or `GITHUB_PUBLIC_READ_TOKEN`
- Persistent volume on `data/runtime` (or `TRACKER_DATA_DIR`) so the issue mirror survives redeploys

Build uses `SKIP_ENV_VALIDATION=1`; validation runs at runtime when the container starts.

## Routes

| Path | Purpose |
|------|---------|
| `/` | Delivery timeline (public) |
| `/bugs` | **Public bug tracker** (open issues labeled `bug`; report via in-app dialog when signed in) |
| `/v/$version` | Global version kanban (all workstreams; auth required) |
| `/v/$version/w/$workstream` | Per-workstream kanban (auth required) |
| `/workstreams/v/$version` | Workstream summary cards (auth required) |
| `/versions/$version/workstreams/$slug` | Workstream catalog overview (auth required) |
| `/login` | GitHub OAuth sign-in |
| `/docs/catalog` | Platform-spec catalog (all documents, including ADRs) |
| `/docs/proposals` | Spec change proposals (draft → validate → PR) |

Sidebar **Bugs** is global (no delivery version). **Hub** opens the cross-site Beskid services overlay (shared with docs and pckg).

## Permissions

- Any signed-in collaborator can create and move issues.
- **Repository owner** (or org admin): define new `roadmap/version/*` labels and approve spec linkages (`roadmap/spec-approval/*`).

## Seed catalog (git-derived)

Historical completed work for **v0.1–v0.3** lives under [`data/seed/`](data/seed/) as JSON (one file per entity). See [`data/seed/README.md`](data/seed/README.md) for layout, cutoffs, and `bun run seed:write` / `seed:validate`.

Set `ROADMAP_USE_SEED=1` to serve the kanban and workstreams dashboards from that catalog locally (read-only; issue create/approve still require GitHub when seed mode is off).

## Layout

- `src/routes/` — UI and `/api/auth/*` server routes
- `src/server/` — `createServerFn` handlers (`roadmap.ts`, `issues.ts`, `public-bugs.ts`)
- `src/lib/storage/` — SQLite schema and issue repository
- `src/lib/sync/` — GitHub → SQLite sync (webhooks + manual bootstrap)
- `src/routes/api/webhooks/` — GitHub issue webhook receiver
- `src/lib/issues/` — read path from the local mirror
- `src/lib/github/` — labels, mappers, filters, GitHub write helpers
- `src/lib/seed/` — Zod schemas, disk loader, `RoadmapTask` mapping
- `src/lib/platform-spec/` — spec relations block, nav search, and **docs management** (full catalog + per-doc bundles from `/generated/platform-spec-catalog.json`, proposal drafts in SQLite, PR submit via GitHub API)

## Auth flow

1. `GET /api/auth/github` — redirect to GitHub (CSRF state cookie)
2. `GET /api/auth/callback` — exchange code, set session cookie, redirect `/v/v0.2`
3. `POST /api/auth/logout` — clear session
4. `/` is public; kanban and workstreams require sign-in
