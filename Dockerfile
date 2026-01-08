# ============================================
# Build stage
# ============================================
FROM node:24-slim AS builder

RUN corepack enable \
  && apt-get update \
  && apt-get install -y openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Prisma v7 requires DATABASE_URL at generate time
ARG DATABASE_URL=postgresql://user:pass@localhost:5432/db
ENV DATABASE_URL=$DATABASE_URL

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma/

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm prisma generate \
  && pnpm build \
  && test -f dist/src/main.js || (echo "❌ Build failed" && exit 1)

# ============================================
# Runtime stage
# ============================================
FROM node:24-slim

RUN corepack enable \
  && apt-get update \
  && apt-get install -y dumb-init \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

RUN groupadd -r nestjs \
  && useradd -r -g nestjs nestjs

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh

RUN chown -R nestjs:nestjs /app
USER nestjs

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--", "./entrypoint.sh"]
