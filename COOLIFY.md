# Coolify: Beskid Tracker

Application: **beskid tracker** (`Cyber-Nomad-Collective/beskid`, branch `main`, base directory `/beskid_tracker`).

## Compose entry

Use [`docker-compose.yml`](docker-compose.yml) or [`infra/docker-compose.yml`](infra/docker-compose.yml) (equivalent build; **build context is the superrepo root**, not `beskid_tracker/` alone).

## Submodule clone failures

Coolify may clone with `--recurse-submodules --shallow-submodules`. The **tracker image does not need submodules** — only `beskid_tracker/`, `packages/beskid-docs-ui/`, and `packages/trudoc/`. Recommended settings:

1. **Disable recursive submodules** for this application, or limit init to none.
2. If submodules stay enabled, prefer a **non-shallow** clone when fetches fail on pinned SHAs.

The docs site (`/site`) and tracker (`/beskid_tracker`) are separate Coolify applications; deploy [site/COOLIFY.md](../site/COOLIFY.md) first so `https://beskid-lang.org/generated/platform-spec-catalog.json` exists for docs management.

## Build

- Image: [`Dockerfile`](Dockerfile) (multi-stage Bun build + `vite preview` on port 3000).
- `SKIP_ENV_VALIDATION=1` during build; GitHub OAuth secrets are required at **runtime**.
- No `.git` in the image; platform-spec catalog is fetched from beskid-lang.org (not generated in-container).

## Runtime secrets

| Variable | Required | Notes |
|----------|----------|--------|
| `GITHUB_CLIENT_ID` | yes | OAuth App |
| `GITHUB_CLIENT_SECRET` | yes | OAuth App |
| `SESSION_SECRET` | yes | 32+ bytes (`openssl rand -base64 32`) |
| `GITHUB_OAUTH_CALLBACK_URL` | yes | Public URL, e.g. `https://tracker.beskid-lang.org/api/auth/callback` |
| `GITHUB_SYNC_TOKEN` or `GITHUB_PUBLIC_READ_TOKEN` | recommended | Manual full sync + bootstrap when the mirror is empty |
| `GITHUB_WEBHOOK_SECRET` | recommended | Issue webhooks at `https://<host>/api/webhooks/github` |
| `TRACKER_PUBLIC_URL` | optional | Public origin, e.g. `https://tracker.beskid-lang.org` |
| `GITHUB_REPO_OWNER` / `GITHUB_REPO_NAME` | optional | Default `Cyber-Nomad-Collective` / `beskid` |
| `PORT` | optional | Default `3000` (must match Coolify proxy target) |

OAuth App scopes: **`read:user`** and **`repo`** (or **`public_repo`** for a public repo).

### GitHub webhook (production)

In the roadmap repository (**Settings → Webhooks → Add webhook**):

- **Payload URL:** `https://<tracker-host>/api/webhooks/github`
- **Content type:** `application/json`
- **Secret:** same value as `GITHUB_WEBHOOK_SECRET`
- **Events:** Issues

After deploy, open the sync drawer → **Settings** to confirm the webhook URL, or set `GITHUB_WEBHOOK_SECRET` in Coolify. Use **Bootstrap sync** on the Sync tab once if the SQLite mirror is empty. Ongoing updates use the webhook only (no polling).

## Persistent storage

Mount a volume on **`/app/beskid_tracker/data/runtime`** (or set `TRACKER_DATA_DIR` to another path inside the container). This holds the SQLite issue mirror (`issues.sqlite`) across redeploys.

## Health

Container healthcheck: `wget -q --spider http://127.0.0.1:3000/`. Map Coolify’s public domain to container port **3000**.

## Local smoke test (superrepo root)

```bash
docker compose -f beskid_tracker/infra/docker-compose.yml up --build
```
