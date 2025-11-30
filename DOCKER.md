# Docker Configuration Guide

This document explains the Docker setup for ChefFlow API, including architecture, workflows, and best practices.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Dockerfile Multi-Stage Build](#dockerfile-multi-stage-build)
- [Docker Compose Services](#docker-compose-services)
- [Quick Start](#quick-start)
- [Development Workflows](#development-workflows)
- [Common Commands Reference](#common-commands-reference)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Architecture Overview

The project uses a **multi-stage Dockerfile** and **docker-compose.yml** with three services:

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
│     - No hot-reload                         │
│                                             │
│  3. app-dev (DEVELOPMENT - target: dev)     │
│     - Port: 4000                            │
│     - Real-time code (volumes)              │
│     - Hot-reload enabled                    │
│     - Profile: dev                          │
└─────────────────────────────────────────────┘
```

## Dockerfile Multi-Stage Build

The Dockerfile consists of 3 stages optimized for different purposes:

### Stage 1: `development`
- Base image: `node:20-slim`
- Installs OpenSSL (required by Prisma)
- Installs pnpm 10.16.1
- Installs all dependencies with `pnpm install --frozen-lockfile`
- Copies all source code
- Generates Prisma Client (uses `prisma.config.ts` with fallback URL)
- Used by `app-dev` service for local development

### Stage 2: `build`
- Compiles TypeScript code
- Generates Prisma Client
- Builds production bundle
- Intermediate stage for production image

### Stage 3: `production`
- Fresh image (optimized)
- Production dependencies only
- Compiled code (`dist/`)
- Includes `prisma.config.ts` for Prisma 7
- Non-root user for security
- Used by `app` service for production deployments

## Docker Compose Services

### 1. postgres

**PostgreSQL 16 Database**

```yaml
Port: 5432
Volume: postgres_data (persistent storage)
Health check: Ensures database is ready before starting app services
Resource limits: 1 CPU, 1GB RAM (max), 256MB (reserved)
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
Command: pnpm prisma migrate deploy && node dist/main.js
Volumes: None (uses compiled code in image)
Resource limits: 1 CPU, 512MB RAM (max), 256MB (reserved)
```

**Key Features:**
- Compiled TypeScript code
- Runs migrations on startup
- Optimized image size
- Non-root user execution

### 3. app-dev (DEVELOPMENT)

**Development environment with hot-reload**

```yaml
Port: 4000
Target: development
Profile: dev (requires --profile dev to start)
Command: pnpm run start:dev
Resource limits: 1 CPU, 1GB RAM (max), 512MB (reserved)
```

**Mounted Volumes:**
- `.:/app` - Real-time code synchronization
- `/app/node_modules` - Excludes local node_modules
- `pnpm-cache:/root/.local/share/pnpm/store` - Persistent pnpm cache

**Key Features:**
- Hot-reload enabled (changes reflect immediately)
- Prisma 7 configuration via `prisma.config.ts`
- Higher rate limits for development
- CORS set to `*` by default

## Quick Start

### First Time Setup

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Edit .env with your configuration
# (database credentials, JWT secret, etc.)

# 3. Start development environment
pnpm run docker:dev

# 4. View logs to verify everything started
pnpm run docker:dev:logs
```

**Access Points:**
- API: `http://localhost:4000`
- Health check: `http://localhost:4000/health`
- Readiness check: `http://localhost:4000/ready`

### Daily Development Workflow

```bash
# Morning: Start development environment
pnpm run docker:dev

# Work on your code (hot-reload active)
# ...

# View logs if needed
pnpm run docker:dev:logs

# Evening: Stop environment
pnpm run docker:down
```

## Development Workflows

### Workflow 1: Docker Development (Recommended)

**Best for:** Full development environment with production parity and hot-reload.

**When to use:**
- Daily development work
- Testing with production-like environment
- Team collaboration (consistent environment)

**Commands:**

```bash
# Start development environment (port 4000)
pnpm run docker:dev

# View logs in real-time
pnpm run docker:dev:logs

# Stop environment
pnpm run docker:down

# Restart container (after .env changes)
pnpm run docker:restart
```

**Pros:**
- Hot-reload works perfectly
- Production-like environment
- No local Node.js installation needed
- Consistent across team members

**Cons:**
- Slightly slower than native development
- Requires Docker installation

### Workflow 2: Installing New Dependencies

**When you add new packages to package.json:**

```bash
# Option 1: Quick rebuild (recommended for most cases)
pnpm run docker:dev:rebuild

# Option 2: Full clean rebuild (if Option 1 fails)
pnpm run docker:dev:clean
```

**What each command does:**

- **`docker:dev:rebuild`**: Rebuilds without cache and restarts
  - Fast and usually sufficient
  - Use this first

- **`docker:dev:clean`**: Removes pnpm-cache, rebuilds, and restarts
  - More thorough, takes longer
  - Use when having dependency issues
  - Solves "Cannot find module" errors

**Example workflow:**

```bash
# 1. Install new package locally
pnpm add @nestjs/swagger

# 2. Rebuild container to install in Docker
pnpm run docker:dev:rebuild

# 3. Verify it worked
pnpm run docker:dev:logs
```

**Note:** With Prisma 7, the client is automatically generated during the Docker build using `prisma.config.ts` configuration.

### Workflow 3: Local Development (Without Docker)

**Best for:** Quick iteration without Docker overhead.

**When to use:**
- Rapid prototyping
- Debugging with Node.js debugger
- When Docker is slow on your machine

**Setup:**

```bash
# 1. Start PostgreSQL only (in Docker)
docker-compose up -d postgres

# 2. Update DATABASE_URL in .env to use localhost
# DATABASE_URL="postgresql://chefflow_user:chefflow_password@localhost:5432/chefflow?schema=public"

# 3. Generate Prisma Client and run migrations
pnpm run prisma:generate
pnpm run prisma:migrate

# 4. Start development server
pnpm run start:dev
```

**Pros:**
- Faster startup
- Direct access to Node.js debugger
- No Docker overhead

**Cons:**
- Requires local Node.js and pnpm installation
- Different environment from production
- Database still needs Docker

### Workflow 4: Production Testing

**Best for:** Testing production builds before deployment.

**When to use:**
- Before deploying to production
- Testing optimized builds
- Verifying Docker configuration

**Commands:**

```bash
# Start production environment (port 4000)
pnpm run docker:up

# View logs
pnpm run docker:logs

# Rebuild after code changes
docker-compose up -d --build app

# Stop services
pnpm run docker:down
```

**Access Points:**
- API: `http://localhost:4000`
- Health check: `http://localhost:4000/health`
- Readiness check: `http://localhost:4000/ready`

## Common Commands Reference

### Most Used Commands (Your Daily Workflow)

```bash
# Start development
pnpm run docker:dev

# Stop development
pnpm run docker:down

# View logs
pnpm run docker:dev:logs

# Restart after .env changes
pnpm run docker:restart

# Rebuild after installing dependencies
pnpm run docker:dev:rebuild

# Full clean rebuild (fixes dependency issues)
pnpm run docker:dev:clean
```

### Service Management

```bash
# View running containers
docker-compose ps
docker-compose --profile dev ps  # Include app-dev

# Start services
pnpm run docker:dev              # Development (port 4000)
pnpm run docker:up               # Production (port 4000)

# Stop services
pnpm run docker:down             # Stop and remove containers
docker-compose stop              # Stop without removing

# Restart services
pnpm run docker:restart          # Restart dev container
docker-compose restart app-dev   # Same as above
docker-compose restart postgres  # Restart database
```

### Logs and Debugging

```bash
# View logs (pnpm commands)
pnpm run docker:dev:logs         # Development logs (follow mode)
pnpm run docker:logs             # All services logs (follow mode)

# View logs (docker-compose commands)
docker-compose logs app-dev -f       # Development logs
docker-compose logs app -f           # Production logs
docker-compose logs postgres -f      # Database logs
docker-compose logs app-dev --tail=100  # Last 100 lines

# Attach to container (see logs in foreground)
pnpm run docker:dev:attach
```

### Executing Commands Inside Containers

```bash
# Open shell in container
docker-compose exec app-dev sh
docker-compose exec app sh

# Run tests inside container
docker-compose exec app-dev pnpm run test
docker-compose exec app-dev pnpm run test:e2e

# Run Prisma commands (Prisma 7)
docker-compose exec app-dev pnpm prisma generate      # Regenerate Prisma Client
docker-compose exec app-dev pnpm prisma studio        # Open Prisma Studio GUI
docker-compose exec app-dev pnpm prisma migrate dev --name add_field
docker-compose exec app pnpm prisma migrate deploy

# Access PostgreSQL directly
docker-compose exec postgres psql -U chefflow_user -d chefflow

# Inside PostgreSQL, useful commands:
# \dt              - List all tables
# \d table_name    - Describe table
# \q               - Exit
```

### Building and Rebuilding

```bash
# Rebuild commands (pnpm)
pnpm run docker:dev:rebuild      # Quick rebuild without cache
pnpm run docker:dev:clean        # Full clean: remove cache + rebuild

# Manual rebuild commands
docker-compose build app-dev                    # Build with cache
docker-compose build --no-cache app-dev         # Build without cache
docker-compose up -d --build app-dev           # Build and start

# Build production
docker-compose build app
docker-compose build --no-cache app
```

### Volume Management

```bash
# List volumes
docker volume ls

# Inspect specific volume
docker volume inspect chefflow-api_postgres_data
docker volume inspect chefflow-api_pnpm-cache

# Remove pnpm cache (when having dependency issues)
pnpm run docker:clean:cache
# or
docker volume rm chefflow-api_pnpm-cache

# Remove postgres data (WARNING: deletes all data!)
docker volume rm chefflow-api_postgres_data

# Remove all volumes (WARNING: deletes all data!)
docker-compose down -v
```

### Clean Up

```bash
# Clean up development environment
pnpm run docker:clean            # Remove containers + volumes

# Manual cleanup
docker-compose down               # Remove containers
docker-compose down -v            # Remove containers + volumes
docker-compose down --rmi all -v  # Remove everything + images

# System-wide Docker cleanup
docker system prune -a --volumes  # Clean entire Docker system
docker volume prune               # Remove unused volumes
docker image prune -a             # Remove unused images
```

## Troubleshooting

### New Dependencies Not Installing (pnpm-cache issue)

**Symptoms:**
- TypeScript compilation errors: `Cannot find module 'package-name'`
- Package exists in `package.json` but not available in container
- `pnpm install` inside container doesn't help
- Container restart doesn't fix the issue

**Root Cause:**
The `pnpm-cache` volume retains old state and prevents new dependencies from installing properly.

**Solution (Quick):**

```bash
# One command to fix everything
pnpm run docker:dev:clean
```

**Solution (Step by Step):**

```bash
# 1. Stop all services
pnpm run docker:down

# 2. Remove pnpm cache
pnpm run docker:clean:cache
# or: docker volume rm chefflow-api_pnpm-cache

# 3. Rebuild without cache
docker-compose build --no-cache app-dev

# 4. Start services
pnpm run docker:dev
```

**Verification:**

```bash
# Check packages installed successfully
docker-compose logs app-dev | grep "Packages:"
# Should show: Packages: +742 (or similar number)

# Verify application started without errors
pnpm run docker:dev:logs
# Should see: "Nest application successfully started"
```

**Prevention:**
- After adding dependencies, always use: `pnpm run docker:dev:rebuild`
- If issues persist, use: `pnpm run docker:dev:clean`

### Container Keeps Restarting

**Symptoms:**
- Container starts and immediately stops
- Continuous restart loop

**Check logs:**

```bash
docker-compose logs app-dev --tail=50
```

**Common Causes and Solutions:**

1. **Database not ready**
   - Wait for healthcheck (usually 10-30 seconds)
   - Check: `docker-compose ps` - postgres should be "healthy"

2. **Migration errors**
   ```bash
   # View migration errors
   docker-compose logs app-dev | grep "prisma"

   # Fix: Reset migrations
   docker-compose exec app-dev pnpm prisma migrate dev
   ```

3. **Missing environment variables**
   ```bash
   # Check .env file exists and has required variables
   cat .env | grep -E "DATABASE_URL|JWT_SECRET|PORT"

   # Copy from template if missing
   cp .env.example .env
   ```

4. **Port already in use**
   ```bash
   # Check what's using port 3001
   lsof -i :3001

   # Kill process or change port in docker-compose.yml
   ```

### Database Connection Refused

**Symptoms:**
- App can't connect to database
- Error: "ECONNREFUSED" or "Connection refused"

**Solutions:**

```bash
# 1. Check if postgres is healthy
docker-compose ps
# postgres should show "healthy" status

# 2. Check database logs
docker-compose logs postgres

# 3. Verify DATABASE_URL in .env
# IMPORTANT: Must use 'postgres' hostname, not 'localhost'
# ✅ Correct: postgresql://user:pass@postgres:5432/db
# ❌ Wrong:   postgresql://user:pass@localhost:5432/db

# 4. Restart database
docker-compose restart postgres

# 5. Test readiness endpoint
curl http://localhost:4000/ready
```

### Hot-Reload Not Working

**Symptoms:**
- Code changes don't reflect in running app
- Need to restart container to see changes

**Solutions:**

```bash
# 1. Check volumes are mounted correctly
docker-compose config
# Should see: .:/app under volumes

# 2. Restart container
pnpm run docker:restart

# 3. Rebuild if necessary
pnpm run docker:dev:rebuild

# 4. Check file is not in excluded directory
# node_modules, dist, .git are excluded from hot-reload
```

### Migration Errors

**Symptoms:**
- "Migration failed" errors
- Database schema out of sync

**Solutions:**

```bash
# Option 1: Apply migrations manually
docker-compose exec app-dev pnpm prisma migrate dev

# Option 2: Reset database (WARNING: deletes all data!)
docker-compose down -v
docker volume rm chefflow-api_postgres_data
pnpm run docker:dev

# Option 3: Reset only migrations
pnpm run prisma:migrate:reset

# View migration history
docker-compose exec app-dev pnpm prisma migrate status
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
# Change: "4000:4000" to "4001:4000"
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

# Remove specific unused volumes
docker volume ls
docker volume rm <volume_name>
```

### Permission Errors with Volumes

**Symptoms:**
- "Permission denied" errors
- Files can't be written

**Solutions:**

```bash
# Fix permissions inside container
docker-compose exec app-dev chown -R node:node /app

# Or rebuild with correct permissions
pnpm run docker:dev:rebuild
```

### TypeScript Compilation Errors After Pull

**Symptoms:**
- After `git pull`, TypeScript errors appear
- Types seem out of sync
- Prisma Client types missing

**Solutions:**

```bash
# 1. Regenerate Prisma Client (Prisma 7)
docker-compose exec app-dev pnpm prisma generate

# 2. Restart to pick up new types
pnpm run docker:restart

# 3. If still failing, rebuild container
pnpm run docker:dev:rebuild

# 4. If still failing, full clean
pnpm run docker:dev:clean
```

### Environment Variables Not Updating

**Symptoms:**
- Changed .env but app still uses old values

**Solutions:**

```bash
# Restart container to reload .env
pnpm run docker:restart

# If not working, rebuild
pnpm run docker:dev:rebuild
```

## Best Practices

### Development

1. **Use the right command for the job**
   - Daily work: `pnpm run docker:dev`
   - After installing packages: `pnpm run docker:dev:rebuild`
   - Dependency issues: `pnpm run docker:dev:clean`

2. **Monitor logs regularly**
   ```bash
   pnpm run docker:dev:logs
   ```
   Helps catch issues early

3. **Keep .env updated**
   - Check `.env.example` when pulling changes
   - Never commit `.env` with secrets

4. **Use hot-reload effectively**
   - Most changes reload automatically
   - Changes to `package.json` require rebuild
   - Changes to `.env` require restart

### Production

1. **Test production builds locally**
   ```bash
   pnpm run docker:up
   ```
   Test before deploying

2. **Run migrations separately in production**
   ```bash
   pnpm prisma migrate deploy
   ```
   Don't use interactive migrations in production

3. **Use environment-specific secrets**
   - Never use default passwords in production
   - Generate strong `JWT_SECRET`
   ```bash
   openssl rand -base64 32
   ```

4. **Monitor resource usage**
   - Resource limits configured in `docker-compose.yml`
   - Adjust based on your server capacity

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
   docker-compose exec app-dev pnpm prisma studio
   # Opens GUI at http://localhost:5555
   ```

### Images

1. **Tag images properly**
   ```bash
   docker build -t chefflow-api:v1.0.0 .
   ```
   Use semantic versioning

2. **Keep images small**
   - Multi-stage builds already optimize this
   - Don't add unnecessary files

3. **Scan for vulnerabilities**
   ```bash
   docker scan chefflow-api-app
   ```

## Quick Reference Card

```bash
# 🚀 Start/Stop
pnpm run docker:dev              # Start development
pnpm run docker:down             # Stop everything

# 📦 After Installing Dependencies
pnpm run docker:dev:rebuild      # Quick rebuild
pnpm run docker:dev:clean        # Full clean rebuild

# 📋 Logs
pnpm run docker:dev:logs         # View dev logs

# 🔄 Restart
pnpm run docker:restart          # Restart container

# 🗄️ Database
docker-compose exec postgres psql -U chefflow_user -d chefflow
docker-compose exec app-dev pnpm prisma studio

# 🧪 Testing
docker-compose exec app-dev pnpm run test
docker-compose exec app-dev pnpm run test:e2e

# 🧹 Cleanup
pnpm run docker:clean            # Remove all
pnpm run docker:clean:cache      # Remove pnpm cache only
```

## Environment Variables

The application uses environment variables defined in `.env` file. See `.env.example` for all available options.

**Key Variables:**

```bash
# Database (automatically set in docker-compose.yml for containers)
DATABASE_URL="postgresql://user:pass@postgres:5432/dbname?schema=public"

# Application
NODE_ENV="development"
PORT=4000

# Security
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# OAuth
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:4000/auth/google/callback"

# Frontend
FRONTEND_URL="http://localhost:3000"

# CORS
ALLOWED_ORIGINS="http://localhost:3000"

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=10
```

**Important Notes:**
- When running in Docker, `DATABASE_URL` uses `postgres` hostname (not `localhost`)
- Generate strong `JWT_SECRET` for production: `openssl rand -base64 32`
- Never commit `.env` file with real secrets

## Port Mapping

| Service    | Container Port | Host Port | Purpose              |
|------------|----------------|-----------|----------------------|
| postgres   | 5432           | 5432      | PostgreSQL database  |
| app        | 4000           | 4000      | Production API       |
| app-dev    | 4000           | 4000      | Development API      |

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Prisma Docker Guide](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-docker)
- [NestJS Docker](https://docs.nestjs.com/recipes/docker)
