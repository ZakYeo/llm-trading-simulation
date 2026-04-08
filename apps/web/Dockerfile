FROM node:22-bookworm-slim

WORKDIR /workspace

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.eslint.json ./
COPY packages ./packages
COPY apps/web ./apps/web

RUN corepack pnpm install --frozen-lockfile

WORKDIR /workspace/apps/web

EXPOSE 5173

CMD ["corepack", "pnpm", "dev", "--host", "0.0.0.0"]

