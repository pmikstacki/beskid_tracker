# Coolify: Beskid Tracker

Application: **beskid tracker** (`Cyber-Nomad-Collective/beskid_tracker`, branch `main`, repository root).

## Compose entry

[`docker-compose.yml`](docker-compose.yml)

## Build

- Image: [`Dockerfile`](Dockerfile)
- **`NODE_AUTH_TOKEN`** (build secret, required): GitHub PAT or fine-grained token with **`read:packages`** for `@beskid/*` and `@cyber-nomad-collective/*` during `bun install` (see [`.npmrc.example`](.npmrc.example))

## Runtime secrets

Set in Coolify **Environment Variables** (runtime-only secrets: uncheck **Available at buildtime**).

| Variable | Required | Notes |
|----------|----------|--------|
| `AUTH_HUB_PUBLIC_URL` | yes | Shared [auth hub](../site/auth/COOLIFY.md) — **one** GitHub OAuth app on the hub |
| `SESSION_SECRET` | yes | ≥32 chars; tracker session cookies |
| `GITHUB_REPO_OWNER` / `GITHUB_REPO_NAME` | yes | Target repository |
| `TRACKER_PUBLIC_URL` | recommended | Public origin (webhooks, pairing `publicUrl`) |
| `GITHUB_PUBLIC_READ_TOKEN` | optional | Anonymous GitHub reads when not signed in |
| `GITHUB_SYNC_TOKEN` | optional | Background sync PAT |
| `GITHUB_WEBHOOK_SECRET` | optional | Verifies GitHub webhooks |

Do **not** set `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, or `GITHUB_OAUTH_CALLBACK_URL` on the tracker.

## Service pairing

1. Deploy and complete [auth hub](../site/auth/COOLIFY.md) onboarding (GitHub OAuth + hub admin).
2. Hub admin: **Admin → Service pairing → New** — app `tracker`, public URL = `TRACKER_PUBLIC_URL` (e.g. `https://tracker.beskid-lang.org`).
3. Tracker admin: **Settings → Auth pairing** — enter the code (stores encrypted service token).
4. Sign-in: `/login` → hub GitHub OAuth → `/api/auth/hub-finish` → tracker session. GitHub API calls use `AUTH_HUB_PUBLIC_URL/api/v1/github/*`.

## Health

`wget -q --spider http://127.0.0.1:3000/api/health` (adjust port if overridden)

## Local smoke

```bash
cp .env.example .env
# Start site/auth on :8090, complete onboarding, pair tracker
bun install && bun run dev
```
