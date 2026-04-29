# syntax=docker/dockerfile:1.7

# ---- build stage: produce a static SPA bundle ----
FROM node:24-alpine AS build
WORKDIR /app

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
COPY packages/web/package.json packages/web/

# Install dev deps too — vite, @vitejs/plugin-react, typescript are needed to build.
RUN npm ci --workspaces --include-workspace-root --ignore-scripts

COPY packages/shared/tsconfig.json packages/shared/
COPY packages/shared/src packages/shared/src

COPY packages/web/tsconfig.json packages/web/
COPY packages/web/vite.config.ts packages/web/
COPY packages/web/index.html packages/web/
COPY packages/web/src packages/web/src

WORKDIR /app/packages/web
RUN npx vite build

# ---- runtime stage: nginx serving the bundle ----
FROM nginx:1.27-alpine AS runtime

RUN apk add --no-cache wget

COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/packages/web/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
