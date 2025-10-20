# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ChefFlow API is a NestJS backend application with Prisma ORM and PostgreSQL. The application is fully containerized with Docker and includes comprehensive health checks for production deployments.

## Technology Stack

- **Framework**: NestJS 11.x
- **Runtime**: Node.js 20+
- **Package Manager**: pnpm 10+ (pinned to 10.16.1)
- **Database**: PostgreSQL 16
- **ORM**: Prisma 6.16.1
- **Language**: TypeScript 5.7+

## Common Commands

### Development

```bash
# Install dependencies
pnpm install

# Run in watch mode (local development)
pnpm run start:dev

# Build the application
pnpm run build

# Run production build locally
pnpm run start:prod

# Format code
pnpm run format

# Lint and fix
pnpm run lint
```

### Testing

```bash
# Run unit tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Run e2e tests
pnpm run test:e2e

# Generate coverage report
pnpm run test:cov

# Debug tests
pnpm run test:debug
```

### Database (Prisma)

```bash
# Generate Prisma Client (run after schema changes)
pnpm run prisma:generate

# Create and apply migration (development)
pnpm run prisma:migrate

# Apply migrations (production - non-interactive)
pnpm run prisma:migrate:deploy

# Open Prisma Studio (database GUI)
pnpm run prisma:studio

# Seed database
pnpm run prisma:seed
```

### Docker

```bash
# Build and run production stack
pnpm run docker:up

# Run development stack with hot-reload (port 3001)
pnpm run docker:dev

# Stop all services
pnpm run docker:down

# Build Docker image
pnpm run docker:build

# View logs
docker-compose logs -f app

# Execute commands inside container
docker-compose exec app pnpm prisma studio
```

## Architecture

### Core Structure

```
src/
├── main.ts              # Application entry point with shutdown hooks
├── app.module.ts        # Root module - registers all providers
├── app.controller.ts    # Root controller with health endpoints
├── app.service.ts       # Root service
└── prisma.service.ts    # Prisma client with lifecycle hooks
```

### Database Layer (Prisma)

- **PrismaService** (`src/prisma.service.ts`): Singleton service that extends PrismaClient
  - Implements `OnModuleInit` to connect on app startup
  - Implements `OnModuleDestroy` to gracefully disconnect on shutdown
  - Registered as global provider in `AppModule`
  - Inject into any service/controller that needs database access

- **Schema Location**: `prisma/schema.prisma`
  - Single User model with authentication support (LOCAL, GOOGLE, APPLE, GITHUB providers)
  - Uses PostgreSQL as datasource
  - No custom output path - uses default for Docker compatibility

### Health Checks

The application provides two health check endpoints (src/app.controller.ts):

1. **`GET /health`** - Liveness probe
   - Returns `200 OK` if application is running
   - Used by Docker and orchestrators to restart unhealthy containers
   - Does NOT check database connectivity

2. **`GET /ready`** - Readiness probe
   - Returns `200 OK` if application AND database are ready
   - Returns `503 Service Unavailable` if database is unreachable
   - Used by load balancers to route traffic only to healthy instances
   - Executes `SELECT 1` query to verify database connection

### Docker Architecture

**Multi-stage Dockerfile**:
- `base`: Node 20 slim + OpenSSL + pnpm setup
- `dependencies`: Dependency installation
- `development`: Hot-reload enabled (target for local dev)
- `build`: TypeScript compilation + Prisma generation
- `production`: Optimized final image with non-root user

**Docker Compose Services**:
- `postgres`: PostgreSQL 16 with health checks and persistent volume
- `app`: Production build on port 3000 (auto-runs migrations on startup)
- `app-dev`: Development build on port 3001 with volume mounts (requires `--profile dev`)

**Important Docker Details**:
- Uses `service_healthy` condition to ensure database is ready before app starts
- Automatically runs `pnpm prisma migrate deploy` on container startup
- Health check runs every 30s using `healthcheck.js` script
- Database connection uses service name `postgres:5432` not `localhost`

### Configuration

- **Environment Variables**: Defined in `.env` (use `.env.example` as template)
  - `DATABASE_URL`: PostgreSQL connection string
  - `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`: Docker PostgreSQL credentials
  - `NODE_ENV`: Environment mode
  - `PORT`: Application port (default 3000)
  - `JWT_SECRET`, `JWT_EXPIRES_IN`: Authentication config
  - `ALLOWED_ORIGINS`: Comma-separated CORS origins (e.g., "http://localhost:3000,http://localhost:5173")
  - `THROTTLE_TTL`: Rate limiting time window in seconds (default 60)
  - `THROTTLE_LIMIT`: Max requests per TTL window (default 10)
  - `HEALTH_CHECK_TIMEOUT`: Health check timeout in milliseconds (default 5000)

- **TypeScript Config**: Uses `moduleResolution: "node"` for pnpm + Prisma compatibility

### Security Features

The application includes several security layers:

1. **Helmet**: HTTP security headers protection
2. **CORS**: Configurable cross-origin resource sharing
3. **Rate Limiting**: Global throttling via `@nestjs/throttler`
   - Default: 10 requests per 60 seconds
   - Applied to all endpoints automatically
4. **Validation**: Global validation pipe with class-validator
   - Strips unknown properties (`whitelist: true`)
   - Rejects requests with invalid properties
   - Auto-transforms payloads to DTO types

### Lifecycle Management

- **Shutdown Hooks Enabled** (`main.ts`): Calls `app.enableShutdownHooks()`
  - Critical for clean Prisma disconnection in Docker
  - Triggers `OnModuleDestroy` lifecycle hook when app receives SIGTERM/SIGINT

## Development Workflow

### Adding Database Changes

1. Modify `prisma/schema.prisma`
2. Run `pnpm run prisma:generate` to regenerate client types
3. Create migration: `pnpm run prisma:migrate` (or in Docker: `docker-compose exec app pnpm prisma migrate dev --name migration_name`)
4. Migration files are stored in `prisma/migrations/`

### Working with Docker

- Use `app-dev` service for development with hot-reload
- Production migrations run automatically via command override in docker-compose.yml
- Access Prisma Studio in container: `docker-compose exec app pnpm prisma studio`
- Direct database access: `docker-compose exec postgres psql -U chefflow_user -d chefflow`

### Testing Database Connectivity

```bash
# Test readiness endpoint
curl http://localhost:3000/ready

# Stop database to test failure handling
docker-compose stop postgres

# Should return 503
curl -i http://localhost:3000/ready

# Restart database
docker-compose start postgres
```

## Key Implementation Patterns

### Prisma Service Injection

```typescript
@Injectable()
export class SomeService {
  constructor(private readonly prisma: PrismaService) {}

  async findUser(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }
}
```

### Health Check Pattern

- Always use `/ready` endpoint in production health checks (includes DB verification)
- Use `/health` for simple liveness probes that don't need DB connectivity

### Module Registration

All new modules should be:
1. Added to `imports` array in `AppModule`
2. Include `PrismaService` in providers if database access is needed

### Rate Limiting Customization

To exempt specific endpoints from rate limiting:

```typescript
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle() // Skip throttling for entire controller
@Controller('public')
export class PublicController {}

// Or skip for specific endpoints
@Get('health')
@SkipThrottle() // Skip throttling for this endpoint only
getHealth() {}
```

To customize rate limits for specific endpoints:

```typescript
import { Throttle } from '@nestjs/throttler';

@Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
@Post('login')
login() {}
```

### Docker Resource Management

Resource limits are configured in `docker-compose.yml`:
- **PostgreSQL**: 1 CPU, 1GB RAM (max), 256MB (reserved)
- **App (production)**: 1 CPU, 512MB RAM (max), 256MB (reserved)
- **App (dev)**: 1 CPU, 1GB RAM (max), 512MB (reserved)

Adjust these in the `deploy.resources` section based on your server capacity.
