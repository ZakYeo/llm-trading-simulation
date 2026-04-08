FROM node:22-bookworm-slim

WORKDIR /workspace

RUN apt-get update \
  && apt-get install -y openssl \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.eslint.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN corepack pnpm install --frozen-lockfile
RUN corepack pnpm --filter @llm-sim/api build

WORKDIR /workspace/apps/api

EXPOSE 3000

CMD ["sh", "-c", "corepack pnpm exec prisma generate --schema prisma/schema.prisma && corepack pnpm exec prisma db push --schema prisma/schema.prisma && node dist/main.js"]
