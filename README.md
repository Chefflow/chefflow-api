# ChefFlow API

A production-ready NestJS backend application with JWT and OAuth2 authentication, Prisma ORM, PostgreSQL, and comprehensive Docker support.

## 🚀 Technology Stack

- **Framework**: NestJS 11.x
- **Runtime**: Node.js 20+
- **Package Manager**: pnpm 10.16.1
- **Database**: PostgreSQL 16
- **ORM**: Prisma 7.0.1
- **Language**: TypeScript 5.7+
- **Authentication**: JWT + Google OAuth2
- **Containerization**: Docker & Docker Compose

## ✨ Features

- **Hybrid Authentication System**: Traditional JWT (username/password) + Google OAuth2
- **Account Linking**: Seamlessly link OAuth accounts to existing local accounts
- **Health Checks**: Comprehensive liveness and readiness probes for production deployments
- **Security**: Helmet, CORS, rate limiting, and input validation
- **Hot-Reload Development**: Docker-based development environment with instant code updates
- **Production-Ready**: Multi-stage Docker builds with optimized images
- **Comprehensive Testing**: 139 tests (117 unit + 22 e2e) ensuring reliability

## 📋 Prerequisites

- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) (required)
- [Node.js 20+](https://nodejs.org/) (optional, for local development)
- [pnpm 10+](https://pnpm.io/) (optional, for local development)

## 🛠️ Quick Start

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd chefflow-api
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set at minimum:
   - `DATABASE_URL` (auto-configured for Docker)
   - `JWT_SECRET` (generate with: `openssl rand -base64 32`)
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (if using OAuth)

3. **Start the development environment**:
   ```bash
   pnpm run docker:dev
   ```

4. **Verify it's running**:
   ```bash
   curl http://localhost:4000/health
   # Response: {"status":"ok","timestamp":"..."}
   ```

That's it! The API is now running on **http://localhost:4000** with hot-reload enabled.

> 📘 **For detailed Docker workflows, troubleshooting, and best practices, see [DOCKER.md](./DOCKER.md)**

## 🔄 Development Workflows

### Docker Development (Recommended)

```bash
# Start development with hot-reload (port 4000)
pnpm run docker:dev

# View logs
pnpm run docker:dev:logs

# Stop services
pnpm run docker:down
```

### Local Development (Without Docker)

```bash
# Requires PostgreSQL running separately
pnpm install
pnpm run start:dev  # Port 4000
```

### Production Testing

```bash
# Test production build locally (port 4000)
pnpm run docker:up
```

> 📘 **See [DOCKER.md](./DOCKER.md) for detailed workflows, dependency management, and troubleshooting**

---

## 📋 Essential Commands

### Docker (Most Common)
```bash
pnpm run docker:dev              # Start development
pnpm run docker:down             # Stop services
pnpm run docker:dev:logs         # View logs
pnpm run docker:dev:rebuild      # Rebuild after installing dependencies
```

### Testing
```bash
pnpm run test                    # Unit tests
pnpm run test:e2e               # End-to-end tests
pnpm run test:cov               # Coverage report
```

### Database
```bash
pnpm run prisma:generate         # Regenerate Prisma Client
pnpm run prisma:migrate          # Create and apply migration
pnpm run prisma:studio           # Open database GUI
```

### Development (Local)
```bash
pnpm install                     # Install dependencies
pnpm run start:dev              # Start with hot-reload
pnpm run build                   # Build application
pnpm run format                  # Format code
pnpm run lint                    # Lint and fix
```

> 📘 **For complete command reference and Docker operations, see [DOCKER.md](./DOCKER.md)**

## 🏥 API Endpoints

### Health Checks

```bash
# Liveness probe (app is running)
GET /health
# Response: {"status":"ok","timestamp":"..."}

# Readiness probe (app + database ready)
GET /ready
# Response: {"status":"ready","database":"connected","timestamp":"..."}
```

### Authentication

```bash
# Local authentication (JWT)
POST /auth/register      # Register new user
POST /auth/login         # Login with username/password
GET  /auth/profile       # Get user profile (protected)

# OAuth2 authentication
GET  /auth/google        # Initiate Google OAuth flow
GET  /auth/google/callback  # Google OAuth callback
```

## 🔒 Security Features

- **Authentication**: JWT + Google OAuth2 with account linking
- **HTTP Security**: Helmet middleware with security headers
- **CORS**: Configurable allowed origins
- **Rate Limiting**: 10 requests per 60 seconds (configurable)
- **Input Validation**: Automatic DTO validation with class-validator
- **Environment Security**: All secrets in `.env` file

## 📁 Project Structure

```
chefflow-api/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Migration history
├── prisma.config.ts           # Prisma 7 configuration
├── src/
│   ├── auth/                  # Authentication module (JWT + OAuth)
│   ├── users/                 # User management module
│   ├── prisma/                # Prisma service
│   ├── main.ts                # Application entry point
│   └── app.module.ts          # Root module
├── test/                      # Unit and e2e tests
├── .env                       # Environment variables (create from .env.example)
├── docker-compose.yml         # Docker services configuration
├── Dockerfile                 # Multi-stage Docker build
├── CLAUDE.md                  # Development guide for Claude Code
├── DOCKER.md                  # Comprehensive Docker documentation
└── package.json               # Dependencies and scripts
```

## 🔧 Troubleshooting

Having issues? Check [DOCKER.md](./DOCKER.md) for comprehensive troubleshooting covering:

- **New dependencies not installing** (pnpm-cache issue) - Most common!
- Container restarts and crashes
- Database connection problems
- Hot-reload not working
- Migration errors
- Port conflicts
- And more...

### Quick Fixes

```bash
# Dependencies not found after install?
pnpm run docker:dev:clean

# Environment variables not updating?
pnpm run docker:restart

# Database connection issues?
curl http://localhost:4000/ready
docker-compose logs postgres
```

## 📚 Documentation

- **[DOCKER.md](./DOCKER.md)** - Complete Docker guide with workflows and troubleshooting
- **[CLAUDE.md](./CLAUDE.md)** - Development guide for Claude Code users
- **[NestJS Docs](https://docs.nestjs.com)** - Framework documentation
- **[Prisma Docs](https://www.prisma.io/docs)** - ORM documentation

## 🧪 Testing

This project has comprehensive test coverage:

```bash
# Run all unit tests (117 tests)
pnpm run test

# Run e2e tests (22 tests)
pnpm run test:e2e

# Generate coverage report
pnpm run test:cov

# Watch mode for development
pnpm run test:watch
```

**Test Coverage**:
- Authentication (JWT + OAuth2)
- User management
- Health checks
- Account linking
- Security features

## 📝 License

This project is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
