FROM node:22-bookworm-slim

WORKDIR /workspace

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.eslint.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN corepack pnpm install --frozen-lockfile
RUN corepack pnpm --filter @llm-sim/api build

WORKDIR /workspace/apps/api

EXPOSE 3000

CMD ["sh", "-c", "corepack pnpm prisma generate && corepack pnpm prisma db push && node dist/main.js"]

