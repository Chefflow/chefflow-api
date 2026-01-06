# ============================================
# Build Stage
# ============================================
FROM node:24-slim AS builder

RUN corepack enable && \
    apt-get update && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Only production dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma/

# Install production dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client and build
RUN pnpm prisma generate && \
    pnpm build && \
    test -f dist/src/main.js || (echo "Build failed" && exit 1)

# ============================================
# Runtime Stage
# ============================================
FROM node:24-slim AS runtime

RUN corepack enable && \
    apt-get update && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create non-root user
RUN groupadd -r nestjs && \
    useradd -r -g nestjs -m -d /home/nestjs nestjs

# Copy configuration files
COPY --chown=nestjs:nestjs package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=nestjs:nestjs prisma ./prisma/

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy only the Prisma client generated (not all node_modules)
COPY --chown=nestjs:nestjs --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --chown=nestjs:nestjs --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy the compiled build
COPY --chown=nestjs:nestjs --from=builder /app/dist ./dist

# Change to non-root user
USER nestjs

EXPOSE 3000


CMD ["node", "dist/src/main.js"]