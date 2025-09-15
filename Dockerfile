# Multi-stage build for production optimization
FROM node:20-alpine AS base

# Install pnpm globally
RUN npm install -g pnpm

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
FROM node:20-alpine AS production

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files and install ALL dependencies (including dev for Prisma)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy built application and prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

# Generate Prisma client
RUN pnpm prisma generate

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001
USER nestjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

CMD ["node", "dist/main.js"]
