# Docker Setup for ChefFlow API

This document explains how to dockerize and run the ChefFlow API application with NestJS, Prisma, and PostgreSQL.

## 📋 Prerequisites

- Docker and Docker Compose installed
- pnpm (optional, for local development)

## 🚀 Quick Start

### 1. Configure environment variables

Copy the example file and configure the variables:

```bash
cp .env.example .env
```

Edit the `.env` file with your specific values.

### 2. Run in production

```bash
# Build and run all services
pnpm run docker:up

# Or using docker-compose directly
docker-compose up -d
```

This will start:

- PostgreSQL on port `5432`
- NestJS API on port `3000`

### 3. Run in development mode

```bash
# Run with hot-reload for development
pnpm run docker:dev

# Or using docker-compose directly
docker-compose --profile dev up -d
```

The development application will be available on port `3001`.

## 🐳 Available Docker Commands

### npm/pnpm Scripts

```bash
# Build the image
pnpm run docker:build

# Run individual container
pnpm run docker:run

# Run all services (production)
pnpm run docker:up

# Run in development mode
pnpm run docker:dev

# Stop all services
pnpm run docker:down
```

### Direct Docker Commands

```bash
# Build the image
docker build -t chefflow-api .

# Run only the database
docker-compose up -d postgres

# View logs
docker-compose logs -f app

# Execute Prisma commands in container
docker-compose exec app pnpm prisma studio
docker-compose exec app pnpm prisma migrate dev
```

## 🗄️ Database Management

### Prisma Migrations

```bash
# Apply migrations in production (automatic on startup)
docker-compose exec app pnpm prisma migrate deploy

# Create new migration (development)
docker-compose exec app pnpm prisma migrate dev --name migration_name

# Generate Prisma client
docker-compose exec app pnpm prisma generate

# Open Prisma Studio
docker-compose exec app pnpm prisma studio
```

### Direct PostgreSQL Access

```bash
# Connect to the database
docker-compose exec postgres psql -U chefflow_user -d chefflow
```

## 🔧 Configuration

### Environment Variables

The main environment variables are:

```env
# Database
DATABASE_URL="postgresql://chefflow_user:chefflow_password@postgres:5432/chefflow?schema=public"

# Application
NODE_ENV="production"
PORT=3000

# Security
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"
```

### Ports

- **3000**: API in production mode
- **3001**: API in development mode (with hot-reload)
- **5432**: PostgreSQL

### Volumes

- `postgres_data`: Persistent PostgreSQL data
- `./prisma`: Prisma schemas and migrations (mounted in development)

## 🏗️ Docker Architecture

### Multi-stage Build

The Dockerfile uses multiple stages to optimize size and security:

1. **base**: Base configuration with Node.js and pnpm
2. **dependencies**: Dependencies installation
3. **development**: Development configuration with hot-reload
4. **build**: TypeScript application compilation
5. **production**: Final optimized image for production

### Docker Compose Services

- **postgres**: PostgreSQL database with persistence
- **app**: NestJS application in production mode
- **app-dev**: NestJS application in development mode (`dev` profile)

## 🔍 Debugging and Troubleshooting

### View logs

```bash
# Logs from all services
docker-compose logs -f

# Logs from specific service
docker-compose logs -f app
docker-compose logs -f postgres
```

### Restart services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart app
```

### Clean and rebuild

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (⚠️ this will delete data)
docker-compose down -v

# Rebuild images
docker-compose build --no-cache
```

### Container access

```bash
# Access application container
docker-compose exec app sh

# Access PostgreSQL container
docker-compose exec postgres sh
```

## 📊 Health Checks

The application includes automatic health checks:

- **Endpoint**: `GET /health`
- **Response**: `{ "status": "ok", "timestamp": "2023-..." }`
- **Docker Health Check**: Runs every 30 seconds

## 🚀 Deployment

### Production

To deploy in production:

1. Configure appropriate environment variables
2. Use `docker-compose up -d` to run in background
3. Configure a reverse proxy (nginx) if necessary
4. Implement appropriate monitoring and logging

### Development

For local development:

1. Use the development profile: `docker-compose --profile dev up -d`
2. Code is mounted as volume for hot-reload
3. Changes in TypeScript files are reflected automatically

## 📝 Additional Notes

- Prisma migrations run automatically when starting the container
- PostgreSQL data persists in a Docker volume
- The application uses a non-root user for security
- `.dockerignore` is included to optimize build context
