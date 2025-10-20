# ChefFlow API

A NestJS backend application with Prisma ORM, PostgreSQL, and Docker support for production-ready deployments.

## 🚀 Technology Stack

- **Framework**: NestJS 11.x
- **Runtime**: Node.js 20+
- **Package Manager**: pnpm 10+ (pinned to 10.16.1)
- **Database**: PostgreSQL 16
- **ORM**: Prisma 6.16.1
- **Language**: TypeScript 5.7+
- **Containerization**: Docker & Docker Compose

## 📋 Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [pnpm 10+](https://pnpm.io/)
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)

## 🛠️ Initial Setup

1. **Clone the repository and install dependencies**:
   ```bash
   pnpm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration (database credentials, JWT secret, etc.)

## 🔄 Development Modes

You have **three options** for running the application. Choose based on your workflow:

### Option 1: 🐳 Docker Development (Recommended for full-stack)

**Best for**: Full development environment with hot-reload and isolated services.

```bash
# Start development server with hot-reload on port 3001
pnpm run docker:dev

# Or using docker-compose directly
docker-compose --profile dev up
```

**Features**:
- ✅ Hot-reload enabled (changes reflect instantly)
- ✅ Your local files are mounted into the container
- ✅ PostgreSQL running in Docker
- ✅ Automatic Prisma migrations
- ✅ Port: **3001**

**When to use**: When you want Docker isolation but need to actively develop and see code changes immediately.

---

### Option 2: 💻 Local Development (Without Docker)

**Best for**: Quick iteration without Docker overhead.

```bash
# Start development server with hot-reload
pnpm run start:dev
```

**Features**:
- ✅ Fastest startup time
- ✅ Hot-reload enabled
- ✅ Direct access to node_modules
- ✅ Port: **3000** (configurable in .env)

**Requirements**:
- PostgreSQL must be running (locally or via Docker: `docker-compose up postgres`)
- Update `DATABASE_URL` in `.env` to point to your PostgreSQL instance

**When to use**: When you prefer local development without containers or need direct debugging access.

---

### Option 3: 📦 Docker Production Mode

**Best for**: Testing production builds and deployment validation.

```bash
# Start production server (optimized build)
pnpm run docker:up

# Or using docker-compose directly
docker-compose up -d
```

**Features**:
- ✅ Production-optimized build
- ✅ Multi-stage Docker build
- ✅ Automatic migrations on startup
- ✅ Health checks configured
- ✅ Port: **3000**

**Note**: No hot-reload. Requires rebuild for code changes.

**When to use**: Testing production configuration, deployment validation, or running the final build locally.

---

## 🗂️ Quick Reference: Common Commands

### Development
```bash
# Install dependencies
pnpm install

# Run local development (without Docker)
pnpm run start:dev

# Build the application
pnpm run build

# Run production build locally (without Docker)
pnpm run start:prod

# Format code
pnpm run format

# Lint and fix
pnpm run lint
```

### Docker Operations
```bash
# Development mode with hot-reload (port 3001)
pnpm run docker:dev

# Production mode (port 3000)
pnpm run docker:up

# Stop all services
pnpm run docker:down

# Build Docker image
pnpm run docker:build

# View application logs
docker-compose logs -f app

# View all logs (app + database)
docker-compose logs -f

# Access container shell
docker-compose exec app sh
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

# Inside Docker container
docker-compose exec app pnpm prisma studio
docker-compose exec app pnpm prisma migrate dev --name migration_name
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

## 🏥 Health Checks

The application exposes two health check endpoints:

### 1. Liveness Probe - `GET /health`
Returns `200 OK` if the application is running.

```bash
curl http://localhost:3000/health
# Response: {"status":"ok","timestamp":"2025-10-20T15:34:52.064Z"}
```

**Use case**: Docker/Kubernetes liveness checks to restart unhealthy containers.

### 2. Readiness Probe - `GET /ready`
Returns `200 OK` if the application AND database are ready.
Returns `503 Service Unavailable` if the database is unreachable.

```bash
curl http://localhost:3000/ready
# Response: {"status":"ready","database":"connected","timestamp":"2025-10-20T15:34:34.184Z"}
```

**Use case**: Load balancer readiness checks to route traffic only to healthy instances.

## 🗄️ Database Workflow

### Making Schema Changes

1. **Edit the Prisma schema**:
   ```bash
   # Edit prisma/schema.prisma
   ```

2. **Generate Prisma Client** (updates TypeScript types):
   ```bash
   pnpm run prisma:generate
   ```

3. **Create a migration**:
   ```bash
   # Local development
   pnpm run prisma:migrate

   # Or in Docker
   docker-compose exec app pnpm prisma migrate dev --name add_user_fields
   ```

4. **Migration files** are stored in `prisma/migrations/`

### Accessing the Database

```bash
# Via Prisma Studio (GUI)
pnpm run prisma:studio

# Direct PostgreSQL access (Docker)
docker-compose exec postgres psql -U chefflow_user -d chefflow

# Test database connectivity
curl http://localhost:3000/ready
```

## 🔒 Security Features

- **Helmet**: HTTP security headers
- **CORS**: Configurable via `ALLOWED_ORIGINS` in `.env`
- **Rate Limiting**: Global throttling (default: 10 requests per 60 seconds)
- **Input Validation**: Global validation pipe with class-validator
- **Environment Variables**: Sensitive data isolated in `.env`

### Customizing Rate Limits

```typescript
import { Throttle, SkipThrottle } from '@nestjs/throttler';

// Custom limit for specific endpoint
@Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
@Post('login')
login() {}

// Skip throttling for specific endpoint
@SkipThrottle()
@Get('public')
getPublic() {}
```

## 🐳 Docker Architecture

### Multi-stage Dockerfile
- `base`: Node 20 slim + OpenSSL + pnpm setup
- `dependencies`: Dependency installation
- `development`: Hot-reload enabled (used by `docker:dev`)
- `build`: TypeScript compilation + Prisma generation
- `production`: Optimized final image with non-root user

### Services
- **postgres**: PostgreSQL 16 with health checks and persistent volume
- **app**: Production build (port 3000)
- **app-dev**: Development build with hot-reload (port 3001)

### Resource Limits
Resource limits are configured in `docker-compose.yml`:
- **PostgreSQL**: 1 CPU, 1GB RAM (max)
- **App (production)**: 1 CPU, 512MB RAM (max)
- **App (dev)**: 1 CPU, 1GB RAM (max)

## 📁 Project Structure

```
chefflow-api/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Migration history
│   └── seed.ts               # Database seed script
├── src/
│   ├── main.ts               # Application entry point
│   ├── app.module.ts         # Root module
│   ├── app.controller.ts     # Health check endpoints
│   ├── app.service.ts        # Root service
│   └── prisma.service.ts     # Prisma client with lifecycle hooks
├── test/
│   └── app.e2e-spec.ts       # E2E tests
├── .env                       # Environment variables (create from .env.example)
├── .env.example              # Environment template
├── docker-compose.yml        # Docker services configuration
├── Dockerfile                # Multi-stage Docker build
├── healthcheck.js            # Docker health check script
└── package.json              # Dependencies and scripts
```

## 🔧 Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps

# View database logs
docker-compose logs postgres

# Test database connectivity
curl http://localhost:3000/ready

# Restart database
docker-compose restart postgres
```

### Port Already in Use

```bash
# Check what's using port 3000
lsof -i :3000

# Use a different port (edit .env)
PORT=3001

# Or stop the conflicting service
docker-compose down
```

### Prisma Client Out of Sync

```bash
# Regenerate Prisma Client
pnpm run prisma:generate

# Or in Docker
docker-compose exec app pnpm prisma generate
```

### Docker Build Issues

```bash
# Clean rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 📚 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Docker Documentation](https://docs.docker.com)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## 📝 License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
