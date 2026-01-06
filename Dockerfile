# ============================================
# Build Stage
# ============================================
FROM node:24-slim AS builder

RUN corepack enable && \
    apt-get update && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma/

# Install all deps (needed for build)
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Generate Prisma client and build
RUN pnpm prisma generate && \
    pnpm build && \
    test -f dist/src/main.js || (echo "Build failed" && exit 1)

# ============================================
# Runtime Stage
# ============================================
FROM node:24-slim AS runtime

# Install dumb-init for proper signal handling
RUN corepack enable && \
    apt-get update && \
    apt-get install -y openssl dumb-init && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create non-root user
RUN groupadd -r nestjs && \
    useradd -r -g nestjs -m -d /home/nestjs nestjs && \
    chown -R nestjs:nestjs /app

# Copy package files
COPY --chown=nestjs:nestjs package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=nestjs:nestjs prisma ./prisma/

# Install ONLY production deps
RUN pnpm install --prod --frozen-lockfile

# Copy Prisma client and build from builder
COPY --chown=nestjs:nestjs --from=builder /app/node_modules/.pnpm ./node_modules/.pnpm
COPY --chown=nestjs:nestjs --from=builder /app/dist ./dist

USER nestjs

EXPOSE 3000

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start app
CMD ["node", "dist/src/main.js"]