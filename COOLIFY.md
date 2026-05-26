# Coolify: Beskid Tracker

Application: **Beskid Tracker** (`Cyber-Nomad-Collective/beskid_tracker` or superrepo path `Cyber-Nomad-Collective/beskid`, branch `main`).

## Compose entry

Use [`docker-compose.yml`](docker-compose.yml). **Build context is this repository root** (`context: .`, `dockerfile: Dockerfile`).

Superrepo checkout: set Coolify **base directory** to `/beskid_tracker` (same compose file and Dockerfile).

## Build

- Image: [`Dockerfile`](Dockerfile) — Bun multi-stage build; `SKIP_ENV_VALIDATION=1` at build time.
- **`NODE_AUTH_TOKEN`** (build secret): GitHub Packages read token for `@beskid/docs-ui` during `bun install`. Runtime-only; do not mark OAuth secrets as build-time.
- **`VITE_GITHUB_REPO_DISPLAY_NAME`**: optional display label baked into the client bundle (default `beskid`).

## Runtime secrets and config

Set these in Coolify **Environment Variables** using the exact names below (same as [`.env.example`](.env.example)). Mark **runtime-only** secrets (`GITHUB_CLIENT_SECRET`, `SESSION_SECRET`, tokens) with **Available at buildtime** unchecked so multiline/PAT values are not passed as Dockerfile `ARG`s.

| Variable | Required | Build | Runtime | Notes |
|----------|----------|-------|---------|--------|
| `NODE_AUTH_TOKEN` | yes (build) | yes | no | GitHub Packages read for `@beskid/docs-ui` |
| `GITHUB_CLIENT_ID` | yes | no | yes | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | yes | no | yes | GitHub OAuth App client secret |
| `SESSION_SECRET` | yes | no | yes | 32+ bytes (`openssl rand -base64 32`) |
| `GITHUB_OAUTH_CALLBACK_URL` | yes | no | yes | Public URL + `/api/auth/callback` (e.g. `https://tracker.beskid-lang.org/api/auth/callback`) |
| `GITHUB_REPO_OWNER` | optional | no | yes | Default `Cyber-Nomad-Collective` |
| `GITHUB_REPO_NAME` | optional | no | yes | Default `beskid` |
| `GITHUB_SYNC_TOKEN` | recommended | no | yes | PAT for issue bootstrap/sync (preferred over `GITHUB_PUBLIC_READ_TOKEN`) |
| `GITHUB_PUBLIC_READ_TOKEN` | optional | no | yes | Fallback PAT when `GITHUB_SYNC_TOKEN` unset |
| `GITHUB_WEBHOOK_SECRET` | recommended | no | yes | Webhook HMAC secret (overrides Settings tab value) |
| `TRACKER_PUBLIC_URL` | recommended | no | yes | Public origin for webhook registration (e.g. `https://tracker.beskid-lang.org`); falls back to OAuth callback origin |
| `TRACKER_DATA_DIR` | optional | no | yes | Default `/app/beskid_tracker/data/runtime` (must match compose volume mount) |
| `ISSUES_SYNC_DISABLED` | optional | no | yes | Set `1` to disable GitHub sync |
| `VITE_GITHUB_REPO_DISPLAY_NAME` | optional | yes | yes | UI label (default `beskid`) |

Coolify also injects **`SERVICE_URL_TRACKER`** and **`SERVICE_FQDN_TRACKER`** automatically for the `tracker` service; you do not need to define them manually.

### OAuth App

Create a GitHub OAuth App with callback URL matching `GITHUB_OAUTH_CALLBACK_URL` and scopes **`read:user`** plus **`repo`** (or **`public_repo`** for a public repository).

### Webhook

After deploy, register a repository webhook at `{TRACKER_PUBLIC_URL}/api/webhooks/github` with secret `GITHUB_WEBHOOK_SECRET`, or use the in-app Settings tab (env secret overrides the DB value).

## Persistent data

Compose mounts named volume **`tracker-data`** at `/app/beskid_tracker/data/runtime` so the SQLite issue mirror survives redeploys. Do not bind-mount the seed catalog; it is copied into the image at build time.

## Health

Container healthcheck: `wget -q --spider http://127.0.0.1:3000/`. Map Coolify’s public domain to container port **3000** (e.g. `https://tracker.beskid-lang.org`).

## Local smoke test

Standalone repo:

```bash
cp .env.example .env   # fill real OAuth values for a full smoke test
docker compose up --build
```

Superrepo checkout:

```bash
docker compose -f beskid_tracker/docker-compose.yml up --build
```

## Related applications

- [Docs site](../site/COOLIFY.md) — `https://beskid-lang.org` (platform-spec catalog for tracker docs management)
- [Beskid Nexus](../beskid_nexus/COOLIFY.md) — compiler graph explorer
