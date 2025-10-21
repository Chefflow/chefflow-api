# Docker Configuration Guide

This document explains the Docker setup for ChefFlow API, including architecture, workflows, and best practices.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Dockerfile Multi-Stage Build](#dockerfile-multi-stage-build)
- [Docker Compose Services](#docker-compose-services)
- [Development Workflows](#development-workflows)
- [Common Commands](#common-commands)
- [Troubleshooting](#troubleshooting)

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
│     - Port: 3000                            │
│     - Compiled code (dist/)                 │
│     - No hot-reload                         │
│                                             │
│  3. app-dev (DEVELOPMENT - target: dev)     │
│     - Port: 3001                            │
│     - Real-time code (volumes)              │
│     - Hot-reload enabled                    │
│     - Profile: dev                          │
└─────────────────────────────────────────────┘
```

## Dockerfile Multi-Stage Build

The Dockerfile consists of 4 stages optimized for different purposes:

### Stage 1: `base`
- Base image: `node:20-slim`
- Installs OpenSSL (required by Prisma)
- Installs pnpm 10.16.1
- Copies `package.json` and `pnpm-lock.yaml`

### Stage 2: `dependencies`
- Installs all dependencies with `pnpm install --frozen-lockfile`
- Used as base for both development and build stages

### Stage 3: `development`
- Inherits from `dependencies`
- Copies all source code
- Generates Prisma Client
- Used by `app-dev` service for local development

### Stage 4: `production`
- Fresh image (optimized)
- Production dependencies only
- Compiled code (`dist/`)
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
Port: 3000
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
Port: 3001
Target: development
Profile: dev (requires --profile dev to start)
Command: pnpm prisma migrate dev && pnpm run start:dev
Resource limits: 1 CPU, 1GB RAM (max), 512MB (reserved)
```

**Mounted Volumes:**
- `.:/app` - Real-time code synchronization
- `/app/node_modules` - Excludes local node_modules
- `pnpm-cache:/root/.local/share/pnpm/store` - Persistent pnpm cache

**Key Features:**
- Hot-reload enabled (changes reflect immediately)
- Interactive Prisma migrations
- Higher rate limits for development
- CORS set to `*` by default

## Development Workflows

### Workflow 1: Local Development (Without Docker)

Use this when you want to develop directly on your machine with PostgreSQL in Docker.

```bash
# Start PostgreSQL only
docker-compose up -d postgres

# Run migrations
pnpm prisma migrate dev

# Start development server locally
pnpm run start:dev
```

**Pros:**
- Faster startup
- Direct access to Node.js debugger
- No Docker overhead

**Cons:**
- Requires local Node.js and pnpm installation
- Different environment from production

### Workflow 2: Development with Docker (Hot-Reload) - RECOMMENDED

Use this for the best development experience with production parity.

```bash
# Start PostgreSQL + app-dev
pnpm run docker:dev

# Or using docker-compose directly
docker-compose --profile dev up -d

# View logs in real-time
docker-compose logs app-dev -f

# Stop all services
pnpm run docker:down
```

**Pros:**
- Hot-reload works perfectly
- Production-like environment
- No local Node.js installation needed
- Consistent across team members

**Cons:**
- Slightly slower than native development

**Access Points:**
- API: `http://localhost:3001`
- Health check: `http://localhost:3001/health`
- Readiness check: `http://localhost:3001/ready`

### Workflow 3: Production Testing

Use this to test the production build locally.

```bash
# Build and start production containers
pnpm run docker:up

# Or using docker-compose directly
docker-compose up -d

# Rebuild after code changes
docker-compose up -d --build app

# Stop services
pnpm run docker:down
```

**Access Points:**
- API: `http://localhost:3000`
- Health check: `http://localhost:3000/health`
- Readiness check: `http://localhost:3000/ready`

## Common Commands

### Service Management

```bash
# View running containers
docker-compose ps
docker-compose --profile dev ps  # Include app-dev

# Start services
pnpm run docker:up              # Production
pnpm run docker:dev             # Development

# Stop services
pnpm run docker:down            # Stop and remove containers
docker-compose stop             # Stop without removing
```

### Logs and Debugging

```bash
# View logs
docker-compose logs app -f           # Production logs
docker-compose logs app-dev -f       # Development logs
docker-compose logs postgres -f      # Database logs

# View specific number of log lines
docker-compose logs app --tail=100

# View logs for all services
docker-compose logs -f
```

### Executing Commands in Containers

```bash
# Open shell in container
docker-compose exec app-dev sh
docker-compose exec app sh

# Run Prisma Studio
docker-compose exec app-dev pnpm prisma studio

# Run migrations manually
docker-compose exec app-dev pnpm prisma migrate dev
docker-compose exec app pnpm prisma migrate deploy

# Access PostgreSQL directly
docker-compose exec postgres psql -U chefflow_user -d chefflow
```

### Building and Rebuilding

```bash
# Build specific service
docker-compose build app
docker-compose build app-dev

# Build and start
docker-compose up -d --build

# Build without cache (clean build)
docker-compose build --no-cache app
```

### Volume Management

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect chefflow-api_postgres_data

# Remove volumes (WARNING: deletes data)
docker-compose down -v

# Remove specific volume
docker volume rm chefflow-api_postgres_data
```

### Clean Up

```bash
# Remove containers and networks
docker-compose down

# Remove containers, networks, and volumes
docker-compose down -v

# Remove everything including images
docker-compose down --rmi all -v

# Clean entire Docker system
docker system prune -a --volumes
```

## Environment Variables

The application uses environment variables defined in `.env` file. See `.env.example` for all available options.

**Key Variables:**

```bash
# Database (automatically set in docker-compose.yml for containers)
DATABASE_URL="postgresql://user:pass@postgres:5432/dbname?schema=public"

# Application
NODE_ENV="development"
PORT=3000

# Security
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# CORS
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:5173"

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=10
```

**Note:** When running in Docker, `DATABASE_URL` automatically uses the `postgres` service name instead of `localhost`.

## Port Mapping

| Service    | Container Port | Host Port | Purpose              |
|------------|----------------|-----------|----------------------|
| postgres   | 5432           | 5432      | PostgreSQL database  |
| app        | 3000           | 3000      | Production API       |
| app-dev    | 3000           | 3001      | Development API      |

## Troubleshooting

### Container keeps restarting

```bash
# Check logs for errors
docker-compose logs app --tail=50

# Common causes:
# 1. Database not ready - wait for healthcheck
# 2. Migration errors - check Prisma migrations
# 3. Missing environment variables - verify .env file
```

### Database connection refused

```bash
# Ensure postgres is healthy
docker-compose ps

# Check database logs
docker-compose logs postgres

# Verify DATABASE_URL uses 'postgres' hostname (not localhost)
# Correct: postgresql://user:pass@postgres:5432/db
# Wrong:   postgresql://user:pass@localhost:5432/db
```

### Hot-reload not working in app-dev

```bash
# Ensure volumes are mounted correctly
docker-compose config

# Restart the service
docker-compose restart app-dev

# Rebuild if necessary
docker-compose up -d --build app-dev
```

### Migration errors

```bash
# Reset database (WARNING: deletes all data)
docker-compose down -v
docker volume rm chefflow-api_postgres_data
pnpm run docker:dev

# Or apply migrations manually
docker-compose exec app-dev pnpm prisma migrate dev
```

### Port already in use

```bash
# Find process using the port
lsof -i :3000
lsof -i :3001
lsof -i :5432

# Kill the process or change ports in docker-compose.yml
```

### Out of disk space

```bash
# Clean up Docker resources
docker system prune -a --volumes

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune
```

### Permission errors with volumes

```bash
# If running as non-root user, ensure permissions are correct
docker-compose exec app-dev chown -R node:node /app
```

## Best Practices

### Development

1. **Always use `app-dev` for development** - It has hot-reload and better debugging
2. **Use `pnpm run docker:dev`** - Simpler than remembering docker-compose flags
3. **Keep `.env` file updated** - Copy from `.env.example` when variables change
4. **Monitor logs regularly** - Use `docker-compose logs -f` to catch issues early

### Production

1. **Test production builds locally** - Use `pnpm run docker:up` before deploying
2. **Use environment-specific secrets** - Never commit real secrets to `.env`
3. **Run migrations separately** - In production, run `prisma migrate deploy` before starting app
4. **Set resource limits** - Already configured in `docker-compose.yml`

### Database

1. **Backup postgres_data volume** - Use `docker run --rm -v` to backup
2. **Use named volumes** - Already configured for persistence
3. **Don't delete volumes accidentally** - Be careful with `-v` flag

### Images

1. **Tag images properly** - Use semantic versioning for production
2. **Keep images small** - Multi-stage builds already optimize this
3. **Scan for vulnerabilities** - Use `docker scan chefflow-api-app`

## Quick Reference

```bash
# First time setup
cp .env.example .env
pnpm run docker:dev

# Daily development
pnpm run docker:dev           # Start development environment
docker-compose logs app-dev -f # View logs

# Testing changes
pnpm run docker:up --build    # Test production build

# Clean slate
docker-compose down -v         # Remove everything
pnpm run docker:dev           # Start fresh

# Database access
docker-compose exec postgres psql -U chefflow_user -d chefflow
docker-compose exec app-dev pnpm prisma studio
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Prisma Docker Guide](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-docker)
- [NestJS Docker](https://docs.nestjs.com/recipes/docker)
