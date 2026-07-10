# syntax=docker/dockerfile:1

# ---- Stage 1: build ----
# Vite 8 requires Node 20.19+ / 22.12+. Node 18 (what DEVELOPMENT.md still says)
# will not build this project.
FROM node:22-alpine AS build

WORKDIR /app

# VITE_API_BASE_URL is inlined into the bundle at build time; it cannot be
# changed when the container starts. It is deliberately EMPTY: httpClient.ts
# falls back to '' and issues relative requests to /api/v1/..., which Caddy
# serves from the same origin. That keeps this image environment-agnostic.
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Copied separately so the dependency layer is cached across source changes.
# npm ci needs the lockfile and installs devDependencies -- vite, typescript and
# the plugins all live there, so NODE_ENV must not be `production` here.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# vite.config.mjs sets build.outDir to `build`, not the Vite default `dist`.
RUN npm run build

# ---- Stage 2: runtime ----
FROM nginx:alpine AS runtime

RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

# busybox wget, present in the alpine base.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
