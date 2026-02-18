# Worker Dockerfile - Playwright-based image for Trailhead browser automation
# Multi-stage: compile TS to JS using node:22-alpine, then copy into Playwright base image
# Note: Set `ipc: host` in docker-compose for Chromium performance

FROM node:22-alpine AS builder
RUN npm install -g pnpm@9.15.4
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @trailblaze/api build

# Final stage: Playwright image provides Chromium + browser automation support
FROM mcr.microsoft.com/playwright:v1.50.0-noble AS runner

# Add non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs worker

WORKDIR /app

# Copy compiled output and production dependencies from builder
COPY --from=builder --chown=worker:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=worker:nodejs /app/apps/api/package.json ./apps/api/
COPY --from=builder --chown=worker:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=worker:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=worker:nodejs /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=builder --chown=worker:nodejs /app/packages/shared/node_modules ./packages/shared/node_modules

# Ensure the Playwright profile directory is owned by the worker user
RUN mkdir -p /data/playwright-profiles && \
    chown -R worker:nodejs /data/playwright-profiles

USER worker

ENV NODE_ENV=production
WORKDIR /app/apps/api
CMD ["node", "dist/index.js"]
