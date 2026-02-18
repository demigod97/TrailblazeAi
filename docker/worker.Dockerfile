FROM mcr.microsoft.com/playwright:v1.50.0-noble

RUN npm install -g pnpm@9.15.4
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile

COPY . .

ENV NODE_ENV=production
CMD ["node", "--loader", "tsx", "apps/api/src/index.ts"]
