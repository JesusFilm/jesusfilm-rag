# Serving image — runs the read-only /v1 HTTP adapter (`pnpm serve`) over the
# injected Retriever. Mirrors the devcontainer base (node:20 + pnpm 9.15.0).
# Deps install in their own layer so source edits don't bust the install cache.
FROM node:20-bookworm-slim

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app
RUN chown node:node /app
USER node

COPY --chown=node:node package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# COPY, not bind-mount — the image is self-contained and deploy-like, and the
# host's (darwin) node_modules/esbuild never leak into this linux image. The
# trade-off: code changes need a rebuild (`docker compose up -d --build serve`);
# there is NO hot-reload. Hot-reload would mean a source bind-mount + a
# node_modules volume + a watch runner (e.g. tsx watch) — intentionally not done.
COPY --chown=node:node . .

EXPOSE 8080
CMD ["pnpm", "serve"]
