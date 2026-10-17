FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN npm install --global pnpm@10.4.1
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile
COPY . .
# Only public frontend settings belong in build arguments.
ARG VITE_APP_ID
ARG VITE_OAUTH_PORTAL_URL
ARG VITE_ANALYTICS_ENDPOINT
ARG VITE_ANALYTICS_WEBSITE_ID
RUN pnpm build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3000
WORKDIR /app
# The current server imports Vite at runtime; keep the locked dependencies
# until development-only imports are separated in a future change.
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/scripts ./scripts
USER node
EXPOSE 3000
# Liveness only. Database, login and uploads require separate verification.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD node -e "fetch('http://127.0.0.1:3000/api/trpc/auth.me').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
