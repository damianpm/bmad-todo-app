# syntax=docker/dockerfile:1.7

# ---- deps stage: install only what we need to run the api ----
FROM node:24-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
COPY packages/web/package.json packages/web/

# --ignore-scripts: skip postinstall/prepare hooks for supply-chain hardening.
# Verified: this project's deps (drizzle-orm, pg, fastify, react, vite, ...) do
# not require any postinstall steps to function.
RUN npm ci --omit=dev --workspaces --include-workspace-root --ignore-scripts

# ---- runtime stage ----
FROM node:24-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache wget

ENV NODE_ENV=production \
    PORT=3000

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/tsconfig.base.json ./tsconfig.base.json

COPY packages/shared/package.json packages/shared/
COPY packages/shared/tsconfig.json packages/shared/
COPY packages/shared/src packages/shared/src

COPY packages/api/package.json packages/api/
COPY packages/api/tsconfig.json packages/api/
COPY packages/api/drizzle.config.ts packages/api/
COPY packages/api/src packages/api/src

RUN chown -R node:node /app
USER node

WORKDIR /app/packages/api

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=5 \
    CMD wget -qO- http://127.0.0.1:3000/healthz >/dev/null 2>&1 || exit 1

CMD ["node", "--import", "tsx/esm", "src/server.ts"]
