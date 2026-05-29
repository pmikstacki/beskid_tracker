# Coolify / superrepo: context = repository root, file = beskid_tracker/Dockerfile
FROM oven/bun:latest AS build

WORKDIR /app/beskid_tracker

COPY beskid_tracker/package.json beskid_tracker/bun.lock beskid_tracker/.npmrc ./
ARG NODE_AUTH_TOKEN
ENV NODE_AUTH_TOKEN=${NODE_AUTH_TOKEN}
RUN bun install --frozen-lockfile

COPY beskid_tracker/ ./

ARG VITE_GITHUB_REPO_DISPLAY_NAME=beskid
ENV VITE_GITHUB_REPO_DISPLAY_NAME=${VITE_GITHUB_REPO_DISPLAY_NAME}
ENV SKIP_ENV_VALIDATION=1
RUN bun run build
RUN bun run verify:client-bundle

FROM oven/bun:latest AS runtime

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
