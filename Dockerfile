# ============================================
# DEVELOPMENT STAGE (Simple and fast)
# ============================================
FROM node:20-slim AS development

# Install OpenSSL for Prisma compatibility and security updates
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends openssl && \
    apt-get upgrade -y && \
    rm -rf /var/lib/apt/lists/*

# Enable corepack and install pnpm (pinned version)
RUN corepack enable && corepack prepare pnpm@10.19.0 --activate

WORKDIR /app

# Copy dependency files
COPY package.json pnpm-lock.yaml ./

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy all source code
COPY . .

# Generate Prisma Client (prisma.config.ts has fallback URL)
RUN pnpm prisma generate

EXPOSE 4000

CMD ["pnpm", "run", "start:dev"]

# ============================================
# BUILD STAGE (Compile TypeScript)
# ============================================
FROM node:20-slim AS build

# Install OpenSSL for Prisma compatibility and security updates
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends openssl && \
    apt-get upgrade -y && \
    rm -rf /var/lib/apt/lists/*

# Enable corepack and install pnpm (pinned version)
RUN corepack enable && corepack prepare pnpm@10.19.0 --activate

WORKDIR /app

# Copy dependency files
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (needed for build)
RUN pnpm install --frozen-lockfile

# Copy source code (excluding test files via .dockerignore)
COPY . .

# Generate Prisma Client and build
RUN pnpm prisma generate && \
    pnpm run build

# ============================================
# PRODUCTION STAGE (Optimized runtime)
# ============================================
FROM node:20-slim AS production

# Install OpenSSL for Prisma compatibility, dumb-init for proper signal handling, and security updates
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends openssl dumb-init && \
    apt-get upgrade -y && \
    rm -rf /var/lib/apt/lists/*

# Enable corepack and install pnpm (pinned version)
RUN corepack enable && corepack prepare pnpm@10.19.0 --activate

# Create non-root user for security (before WORKDIR to set ownership)
RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nestjs

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only + Prisma CLI
RUN pnpm install --prod --frozen-lockfile && \
    pnpm add -D prisma

# Copy built application, prisma schema, prisma config, and healthcheck
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./
COPY --from=build /app/healthcheck.js ./

# Generate Prisma Client in production
RUN pnpm prisma generate

# Change ownership of app directory to non-root user
RUN chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

EXPOSE 4000

# Health check with configurable timeout
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node healthcheck.js

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
