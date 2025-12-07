# Docker Configuration Guide

This document explains the simplified Docker setup for ChefFlow API, optimized for cloud deployment.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Dockerfile Multi-Stage Build](#dockerfile-multi-stage-build)
- [Docker Compose Services](#docker-compose-services)
- [Quick Start](#quick-start)
- [Common Commands Reference](#common-commands-reference)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Architecture Overview

The project uses a **simplified multi-stage Dockerfile** optimized for cloud deployment:

```
┌─────────────────────────────────────────────┐
│          docker-compose.yml                 │
├─────────────────────────────────────────────┤
│  1. postgres (PostgreSQL 16)                │
│     - Port: 5432                            │
│     - Volume: postgres_data (persistent)    │
│                                             │
│  2. app (PRODUCTION - target: production)   │
│     - Port: 4000                            │
│     - Compiled code (dist/)                 │
│     - Auto-runs migrations on startup       │
└─────────────────────────────────────────────┘
```

**Key Design Decisions:**
- Single production-ready configuration
- Development happens locally (not in Docker)
- No health check endpoints (handled by cloud provider)
- Minimal resource configuration
- Simplified dependency management

## Dockerfile Multi-Stage Build

The Dockerfile consists of 4 stages optimized for production deployment:

### Stage 1: `base`
- Base image: `node:20`
- Enables pnpm via corepack
- Sets up PNPM_HOME environment

### Stage 2: `deps`
- Installs dependencies with `pnpm install --frozen-lockfile`
- Separate layer for better caching

### Stage 3: `build`
- Compiles TypeScript code
- Generates Prisma Client with `npx prisma generate`
- Builds production bundle with `pnpm build`

### Stage 4: `production`
- Fresh Node.js 20 image
- Production dependencies only (`--prod`)
- Copies compiled code from build stage
- Copies Prisma schema for migrations
- Exposes port 3000 (mapped to 4000 in docker-compose)

## Docker Compose Services

### 1. postgres

**PostgreSQL 16 Database**

```yaml
Port: 5432
Volume: postgres_data (persistent storage)
Restart policy: unless-stopped
```

**Environment Variables:**
- `POSTGRES_DB`: Database name (default: `chefflow`)
- `POSTGRES_USER`: Database user (default: `chefflow_user`)
- `POSTGRES_PASSWORD`: Database password (default: `chefflow_password`)

### 2. app (PRODUCTION)

**Production-ready NestJS application**

```yaml
Port: 4000
Target: production
Command: sh -c "pnpm prisma migrate deploy && node dist/main.js"
Depends on: postgres (service_started)
Restart policy: unless-stopped
```

**Key Features:**
- Compiled TypeScript code
- Runs migrations automatically on startup (`prisma migrate deploy`)
- Optimized image size
- Non-interactive migrations for production

## Quick Start

### First Time Setup

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Edit .env with your configuration
# (database credentials, JWT secret, OAuth credentials, etc.)

# 3. Build and start services
pnpm run docker:build
pnpm run docker:up

# 4. View logs to verify everything started
pnpm run docker:logs
```

**Access Points:**
- API: `http://localhost:4000`
- Database: `localhost:5432`

### Local Development (Recommended)

For development, run the application locally instead of using Docker:

```bash
# 1. Start only PostgreSQL in Docker
docker-compose up -d postgres

# 2. Generate Prisma Client and run migrations
pnpm run prisma:generate
pnpm run prisma:migrate

# 3. Start development server locally
pnpm run start:dev
```

**Pros:**
- Faster startup and hot-reload
- Direct access to Node.js debugger
- Easier dependency installation
- Better IDE integration

## Common Commands Reference

### Service Management

```bash
# Build Docker image
pnpm run docker:build

# Start services in background
pnpm run docker:up

# Stop services
pnpm run docker:down

# Restart app container
pnpm run docker:restart

# View logs (follow mode)
pnpm run docker:logs

# View all running containers
docker-compose ps
```

### Database Management

```bash
# Access PostgreSQL directly
docker-compose exec postgres psql -U chefflow_user -d chefflow

# Inside PostgreSQL, useful commands:
# \dt              - List all tables
# \d table_name    - Describe table
# \q               - Exit

# View database logs
docker-compose logs postgres -f
```

### Executing Commands Inside Container

```bash
# Open shell in app container
docker-compose exec app sh

# Run Prisma commands
docker-compose exec app pnpm prisma migrate deploy
docker-compose exec app pnpm prisma generate
docker-compose exec app pnpm prisma studio

# Check application status
docker-compose exec app node -v
docker-compose exec app pnpm -v
```

### Building and Rebuilding

```bash
# Build with cache
pnpm run docker:build

# Build without cache (after dependency changes)
docker-compose build --no-cache

# Build and start in one command
docker-compose up -d --build

# Rebuild specific service
docker-compose build app
```

### Volume Management

```bash
# List volumes
docker volume ls

# Inspect postgres data volume
docker volume inspect chefflow-api_postgres_data

# Remove postgres data (WARNING: deletes all data!)
docker volume rm chefflow-api_postgres_data

# Remove all volumes (WARNING: deletes all data!)
docker-compose down -v
```

### Clean Up

```bash
# Stop and remove containers
pnpm run docker:down

# Stop and remove containers + volumes
docker-compose down -v

# Remove everything including images
docker-compose down --rmi all -v

# System-wide Docker cleanup
docker system prune -a --volumes
```

## Environment Variables

The application uses environment variables defined in `.env` file. See `.env.example` for all available options.

**Required Variables:**

```bash
# Database (automatically configured in docker-compose.yml)
DATABASE_URL="postgresql://chefflow_user:chefflow_password@postgres:5432/chefflow?schema=public"

# Application
NODE_ENV="production"
PORT=4000

# Security (REQUIRED - generate strong secrets!)
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
CSRF_SECRET="your-csrf-secret"

# OAuth (Google)
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:4000/auth/google/callback"

# Frontend
FRONTEND_URL="http://localhost:5173"

# CORS
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:5173"

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=10
```

**Important Notes:**
- When running in Docker, `DATABASE_URL` uses `postgres` hostname (not `localhost`)
- Generate strong secrets for production:
  ```bash
  # JWT_SECRET
  openssl rand -base64 32

  # CSRF_SECRET
  openssl rand -base64 32
  ```
- Never commit `.env` file with real secrets
- Update `.env` when pulling changes (check `.env.example`)

## Port Mapping

| Service    | Container Port | Host Port | Purpose              |
|------------|----------------|-----------|----------------------|
| postgres   | 5432           | 5432      | PostgreSQL database  |
| app        | 3000           | 4000      | Production API       |

**Note:** The Dockerfile exposes port 3000, but docker-compose maps it to 4000 on the host.

## Troubleshooting

### Container Keeps Restarting

**Symptoms:**
- Container starts and immediately stops
- Continuous restart loop

**Check logs:**

```bash
pnpm run docker:logs
```

**Common Causes and Solutions:**

1. **Database not ready**
   - Wait a few seconds for PostgreSQL to start
   - Check: `docker-compose ps` - postgres should be "Up"

2. **Migration errors**
   ```bash
   # View migration errors
   docker-compose logs app | grep "prisma"

   # Check migration status
   docker-compose exec app pnpm prisma migrate status
   ```

3. **Missing environment variables**
   ```bash
   # Check .env file exists and has required variables
   cat .env | grep -E "DATABASE_URL|JWT_SECRET|CSRF_SECRET"

   # Copy from template if missing
   cp .env.example .env
   ```

4. **Port already in use**
   ```bash
   # Check what's using port 4000
   lsof -i :4000

   # Kill process or change port in docker-compose.yml
   kill -9 <PID>
   ```

### Database Connection Refused

**Symptoms:**
- App can't connect to database
- Error: "ECONNREFUSED" or "Connection refused"

**Solutions:**

```bash
# 1. Check if postgres is running
docker-compose ps

# 2. Check database logs
docker-compose logs postgres

# 3. Verify DATABASE_URL in .env
# IMPORTANT: Must use 'postgres' hostname, not 'localhost'
# ✅ Correct: postgresql://user:pass@postgres:5432/db
# ❌ Wrong:   postgresql://user:pass@localhost:5432/db

# 4. Restart database
docker-compose restart postgres

# 5. Restart app
pnpm run docker:restart
```

### Migration Errors

**Symptoms:**
- "Migration failed" errors
- Database schema out of sync

**Solutions:**

```bash
# Option 1: Apply migrations manually
docker-compose exec app pnpm prisma migrate deploy

# Option 2: Check migration status
docker-compose exec app pnpm prisma migrate status

# Option 3: Reset database (WARNING: deletes all data!)
docker-compose down -v
docker volume rm chefflow-api_postgres_data
pnpm run docker:up
```

### Dependency Installation Issues

**Symptoms:**
- Build fails with "Cannot find module" errors
- Dependencies not installing

**Solutions:**

```bash
# 1. Rebuild without cache
docker-compose build --no-cache

# 2. Verify pnpm-lock.yaml is present
ls -la pnpm-lock.yaml

# 3. Clean Docker build cache
docker builder prune -a

# 4. Rebuild and start
pnpm run docker:build
pnpm run docker:up
```

### Port Already in Use

**Symptoms:**
- "Address already in use" error
- Container fails to start

**Solutions:**

```bash
# Find what's using the port
lsof -i :4000
lsof -i :5432

# Kill the process
kill -9 <PID>

# Or change port in docker-compose.yml
# Change: "4000:4000" to "4001:3000"
```

### Out of Disk Space

**Symptoms:**
- "no space left on device" error
- Docker commands fail

**Solutions:**

```bash
# Check Docker disk usage
docker system df

# Clean up unused resources
docker system prune -a --volumes

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune
```

### Environment Variables Not Updating

**Symptoms:**
- Changed .env but app still uses old values

**Solutions:**

```bash
# Restart container to reload .env
pnpm run docker:restart

# If not working, rebuild
docker-compose up -d --build
```

## Best Practices

### Development

1. **Develop locally, deploy with Docker**
   - Run `pnpm run start:dev` locally for development
   - Use Docker only for testing production builds
   - Keep only PostgreSQL in Docker during development

2. **Keep .env updated**
   - Check `.env.example` when pulling changes
   - Never commit `.env` with secrets
   - Generate strong secrets for production

3. **Test production builds locally**
   ```bash
   pnpm run docker:build
   pnpm run docker:up
   ```
   Test before deploying to cloud

### Production

1. **Use environment-specific secrets**
   - Never use default passwords in production
   - Generate strong secrets:
     ```bash
     openssl rand -base64 32
     ```

2. **Run migrations separately**
   - Migrations run automatically via `docker-compose.yml`
   - Command: `pnpm prisma migrate deploy && node dist/main.js`
   - Non-interactive, safe for production

3. **Monitor logs**
   ```bash
   pnpm run docker:logs
   ```

4. **Health checks**
   - This configuration doesn't include health check endpoints
   - Assumes cloud provider handles health monitoring
   - If needed, add `/health` endpoint to `app.controller.ts`

### Database

1. **Backup regularly**
   ```bash
   # Backup postgres_data volume
   docker run --rm -v chefflow-api_postgres_data:/data -v $(pwd):/backup \
     alpine tar czf /backup/postgres-backup.tar.gz /data
   ```

2. **Don't delete volumes accidentally**
   - Be careful with `-v` flag in `docker-compose down -v`
   - This deletes ALL data

3. **Use Prisma Studio for data inspection**
   ```bash
   # Local development
   pnpm run prisma:studio

   # Inside Docker
   docker-compose exec app pnpm prisma studio
   # Opens GUI at http://localhost:5555
   ```

### Images

1. **Keep images small**
   - Multi-stage builds already optimize this
   - Production image only includes necessary files
   - No dev dependencies in production stage

2. **Rebuild after dependency changes**
   ```bash
   docker-compose build --no-cache
   ```

3. **Tag images for deployment**
   ```bash
   docker build -t chefflow-api:v1.0.0 .
   ```

## Cloud Deployment Notes

This Docker configuration is optimized for cloud platforms like:
- **Railway**: Automatically detects Dockerfile
- **Render**: Uses Dockerfile for deployment
- **Fly.io**: Supports docker-compose or Dockerfile
- **DigitalOcean App Platform**: Dockerfile support
- **AWS ECS/Fargate**: Container-based deployment

**Cloud-specific considerations:**
- Health checks handled by cloud provider
- Environment variables managed in cloud dashboard
- Database usually provided as managed service
- Auto-scaling based on container metrics
- No need for local resource limits

## Quick Reference Card

```bash
# 🚀 Start/Stop
pnpm run docker:up               # Start all services
pnpm run docker:down             # Stop all services

# 🔨 Build
pnpm run docker:build            # Build image
docker-compose build --no-cache  # Build without cache

# 📋 Logs
pnpm run docker:logs             # View logs (follow mode)

# 🔄 Restart
pnpm run docker:restart          # Restart app container

# 🗄️ Database
docker-compose exec postgres psql -U chefflow_user -d chefflow
pnpm run prisma:studio           # Local Prisma Studio

# 🧹 Cleanup
docker-compose down -v           # Remove containers + volumes
docker system prune -a --volumes # Clean entire Docker system
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment)
- [NestJS Docker](https://docs.nestjs.com/recipes/docker)
