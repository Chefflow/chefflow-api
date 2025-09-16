# Multi-stage build for production optimization
FROM node:20-slim AS base

# Install OpenSSL for Prisma compatibility
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Enable corepack and install pnpm (official way)
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
FROM base AS dependencies
RUN pnpm install --frozen-lockfile

# Development stage
FROM dependencies AS development
COPY . .
RUN pnpm prisma generate
EXPOSE 3000
CMD ["pnpm", "run", "start:dev"]

# Build stage
FROM dependencies AS build
COPY . .
RUN pnpm prisma generate
RUN pnpm run build

# Production stage
FROM node:20-slim AS production

# Install OpenSSL for Prisma compatibility
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Enable corepack and install pnpm (official way)
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files and install dependencies (including Prisma CLI)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy built application and prisma schema
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

# Generate Prisma client in production environment
RUN pnpm prisma generate

# Create non-root user for security
RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nestjs
USER nestjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

CMD ["node", "dist/main.js"]
