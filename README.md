# Beskid Tracker

[TanStack Start](https://tanstack.com/start) tracker and roadmap planner for the [Cyber-Nomad-Collective/beskid](https://github.com/Cyber-Nomad-Collective/beskid) superrepo. Public bug reports and the delivery timeline are version-agnostic; kanban boards are per delivery version. **GitHub Issues remain the source of truth** for creates and updates; the app mirrors open issues (and closed `bug`-labeled issues) in a local **SQLite** store and serves reads from that mirror so anonymous traffic does not hammer the GitHub REST API. Each issue belongs to a **delivery version** (`v0.1`–`v0.4`); the kanban board is per version. [Platform specification](https://beskid-lang.org/platform-spec/) nodes are linked with typed relations in issue bodies; the repo owner approves spec linkages.

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
| `ISSUES_SYNC_STALE_MS` | Background refresh interval (default 5 minutes) |
| `ISSUES_SYNC_ON_START` | Set `0` to skip eager sync after the store is warm |
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

**Local** (from `beskid_tracker/`, uses `Dockerfile.local` + `oven/bun:latest`):

```bash
cd beskid_tracker
cp .env.example .env   # optional for container OAuth
podman compose up --build
# or: docker compose up --build
```

Do not run compose from the superrepo root unless you use `infra/docker-compose.yml` (that build copies `beskid_tracker/`, not `site/website/`).

**Coolify / superrepo** (context = repo root):

```bash
docker compose -f beskid_tracker/infra/docker-compose.yml up --build
```

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
| `/v/$version` | Version kanban + filters (auth required) |
| `/workstreams/v/$version` | Workstream dashboard (auth required) |
| `/login` | GitHub OAuth sign-in |

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
- `src/lib/sync/` — GitHub → SQLite sync job
- `src/lib/issues/` — read path from the local mirror
- `src/lib/github/` — labels, mappers, filters, GitHub write helpers
- `src/lib/seed/` — Zod schemas, disk loader, `RoadmapTask` mapping
- `src/lib/platform-spec/` — spec relations block and nav search (fetches nav tree from docs site)

## Auth flow

1. `GET /api/auth/github` — redirect to GitHub (CSRF state cookie)
2. `GET /api/auth/callback` — exchange code, set session cookie, redirect `/v/v0.2`
3. `POST /api/auth/logout` — clear session
4. `/` is public; kanban and workstreams require sign-in
