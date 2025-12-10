# ============================
# Base: Node 20 Alpine
# ============================
FROM node:20-alpine AS base

RUN apk add --no-cache openssl libc6-compat && \
    corepack enable && \
    corepack prepare pnpm@10.19.0 --activate

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

# ============================
# Dependencies
# ============================
FROM base AS deps

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

# ============================
# Build
# ============================
FROM base AS build

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm exec prisma generate && \
    pnpm build && \
    pnpm prune --prod

# ============================
# Production
# ============================
FROM node:20-alpine AS production

RUN apk add --no-cache openssl libc6-compat netcat-openbsd && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/package.json ./package.json
COPY --from=build --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=build --chown=nestjs:nodejs /app/prisma.config.ts ./prisma.config.ts

COPY --chown=nestjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nestjs

EXPOSE 4000

ENTRYPOINT ["./docker-entrypoint.sh"]