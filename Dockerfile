# ============================================
# STAGE 1: Builder
# ============================================
FROM node:24-slim AS builder

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm prisma generate && pnpm build

# ============================================
# STAGE 2: Runtime
# ============================================
FROM node:24-slim

RUN apt-get update && apt-get install -y openssl dumb-init && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production


RUN groupadd -r nestjs && useradd -r -g nestjs -m -d /home/nestjs nestjs
ENV HOME=/home/nestjs


COPY --from=builder --chown=nestjs:nestjs /app /app

RUN chmod +x ./entrypoint.sh

USER nestjs

EXPOSE 3000

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["./entrypoint.sh"]