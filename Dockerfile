# Use node 22.20 and the alpine 3.21 base image (Mini OS)
FROM node:22.20-alpine3.21

# Install pnpm globally (thi command is comming from the doc site)
RUN npm install -g pnpm@latest-10

# Create app directory and 
WORKDIR app/

# Copy package.json and package-lock.json files and install
COPY package*.json .
COPY pnpm-lock.yaml .
RUN pnpm install
COPY . .

# Generate Prisma client and compile application
RUN pnpm prisma generate && pnpm build && \
    # Verify build output exists
    test -f dist/src/main.js || (echo "ERROR: Build failed - dist/src/main.js not found" && exit 1)

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
