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
# Dependencies Stage
# ============================================
FROM node:24-slim AS dependencies

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma/

# Install ONLY production deps + generate Prisma client
RUN pnpm install --prod --frozen-lockfile && \
    pnpm prisma generate

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

# Copy production dependencies from dependencies stage
COPY --chown=nestjs:nestjs --from=dependencies /app/node_modules ./node_modules

# Copy build output from builder
COPY --chown=nestjs:nestjs --from=builder /app/dist ./dist
COPY --chown=nestjs:nestjs --from=builder /app/package.json ./

USER nestjs

EXPOSE 3000

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start app
CMD ["node", "dist/src/main.js"]