# ============================================
# Build stage
# ============================================
FROM node:24-slim AS builder

RUN corepack enable \
  && apt-get update \
  && apt-get install -y openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma/

    # Instalamos deps completas (build + prisma)
RUN pnpm install --frozen-lockfile

COPY . .

# Prisma client + build
RUN pnpm prisma generate \
  && pnpm build \
  && test -f dist/src/main.js || (echo "❌ Build failed" && exit 1)

# ============================================
# Runtime stage (distroless)
# ============================================
FROM gcr.io/distroless/nodejs:24

WORKDIR /app

ENV NODE_ENV=production

# Copiamos solo lo necesario para runtime
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh

USER nonroot

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
