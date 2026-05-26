# Superrepo build (Coolify): context = repo root, file = beskid_tracker/Dockerfile
FROM oven/bun:latest AS build

WORKDIR /app/beskid_tracker

COPY beskid_tracker/package.json beskid_tracker/bun.lock ./
RUN bun install --frozen-lockfile

COPY packages/beskid-docs-ui /app/packages/beskid-docs-ui
COPY beskid_tracker/ ./

ENV SKIP_ENV_VALIDATION=1
RUN bun run build

FROM oven/bun:latest AS runtime

RUN apt-get update \
  && apt-get install -y --no-install-recommends wget \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app/beskid_tracker

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/beskid_tracker/package.json /app/beskid_tracker/bun.lock ./
COPY --from=build /app/beskid_tracker/node_modules ./node_modules
COPY --from=build /app/beskid_tracker/dist ./dist
COPY --from=build /app/beskid_tracker/data/seed ./data/seed

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/ || exit 1

CMD ["bun", "run", "start"]
