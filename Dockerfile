# syntax=docker/dockerfile:1.7
# CI / GHCR (platform-delivery): context = beskid_tracker/, plus named BuildKit
# context `web_common` -> ./beskid_web_common so file:../beskid_web_common resolves.
# Local: docker build -f Dockerfile --build-context web_common=../beskid_web_common .
FROM oven/bun:1.3.14 AS build

WORKDIR /app/beskid_tracker

COPY package.json bun.lock .npmrc ./
# Full checkout: package sources need tsconfig.base.json for Vite transforms.
COPY --from=web_common . /app/beskid_web_common
ARG NODE_AUTH_TOKEN
ENV NODE_AUTH_TOKEN=${NODE_AUTH_TOKEN}

RUN npm install -g pnpm@10.17.1 && pnpm install --dir /app/beskid_web_common --frozen-lockfile --config.package-import-method=copy
RUN --mount=type=cache,target=/bun-cache bun install --frozen-lockfile

COPY . ./

ARG VITE_GITHUB_REPO_DISPLAY_NAME=beskid
ENV VITE_GITHUB_REPO_DISPLAY_NAME=${VITE_GITHUB_REPO_DISPLAY_NAME}
ENV SKIP_ENV_VALIDATION=1
RUN bun run build
RUN bun run verify:client-bundle

FROM oven/bun:1.3.14 AS runtime

RUN apt-get update \
  && apt-get install -y --no-install-recommends wget \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app/beskid_tracker

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/beskid_tracker/package.json /app/beskid_tracker/bun.lock ./
COPY --from=build /app/beskid_tracker/node_modules ./node_modules
COPY --from=build /app/beskid_tracker/.output ./.output
COPY --from=build /app/beskid_tracker/data ./data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["bun", "run", "start"]
