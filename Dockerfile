# ============================================
# Build Stage
# ============================================
FROM node:20-slim AS builder

# Install pnpm and OpenSSL (required by Prisma)
RUN corepack enable && \
    apt-get update && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy pnpm configuration and dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client and compile application
<<<<<<< HEAD
RUN pnpm prisma generate && pnpm build && \
    # Verify build output exists
    test -f dist/src/main.js || (echo "ERROR: Build failed - dist/src/main.js not found" && exit 1)
=======
RUN pnpm prisma generate && pnpm build
>>>>>>> 8a4b258 (Revert "chore: update Dockerfile to use Node 22.20-alpine, streamline installation steps, and adjust Prisma configuration in prisma.config.ts")

# ============================================
# Runtime Stage
# ============================================
FROM node:20-slim AS runtime

# Install pnpm and OpenSSL (Prisma needs it in runtime)
RUN corepack enable && \
    apt-get update && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create non-root user for security with home directory
RUN groupadd -r nestjs && useradd -r -g nestjs -m -d /home/nestjs nestjs && \
    chown -R nestjs:nestjs /home/nestjs

# Copy configuration files
COPY --chown=nestjs:nestjs package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=nestjs:nestjs prisma.config.ts ./
COPY --chown=nestjs:nestjs prisma ./prisma/

# Install ONLY production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy generated Prisma client and build from previous stage
COPY --chown=nestjs:nestjs --from=builder /app/node_modules ./node_modules
COPY --chown=nestjs:nestjs --from=builder /app/dist ./dist

# Change to non-root user
USER nestjs

# Expose application port
EXPOSE 3000

# Start script: run migrations and start app
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/src/main.js"]
