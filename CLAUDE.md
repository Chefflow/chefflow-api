# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ChefFlow API is a NestJS backend application with Prisma ORM and PostgreSQL. The application is fully containerized with Docker and includes comprehensive health checks for production deployments. It features a hybrid authentication system supporting both traditional JWT (LOCAL) and OAuth2 providers (Google, Apple, GitHub).

## Technology Stack

- **Framework**: NestJS 11.x
- **Runtime**: Node.js 20+
- **Package Manager**: pnpm 10+ (pinned to 10.16.1)
- **Database**: PostgreSQL 16
- **ORM**: Prisma 6.16.1
- **Language**: TypeScript 5.7+
- **Authentication**: JWT + Passport.js (JWT Strategy, Google OAuth Strategy)

## Common Commands

### Development

```bash
# Install dependencies
pnpm install

# Run in watch mode (local development on port 4000)
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

# Run specific test file
pnpm run test -- path/to/test.spec.ts

# Run tests matching pattern
pnpm run test -- --testPathPattern="oauth|google"

# Run tests in watch mode
pnpm run test:watch

# Run e2e tests
pnpm run test:e2e

# Run specific e2e test
pnpm run test:e2e -- test/auth-oauth.e2e-spec.ts

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
# Build and run production stack (port 4000)
pnpm run docker:up

# Run development stack with hot-reload (port 4000)
pnpm run docker:dev

# Stop all services
pnpm run docker:down

# Build Docker image
pnpm run docker:build

# View logs (production)
docker-compose logs -f app

# View logs (development)
docker-compose logs -f app-dev

# Execute commands inside container
docker-compose exec app-dev pnpm prisma studio
docker-compose exec app-dev pnpm run test

# Access PostgreSQL directly
docker-compose exec postgres psql -U chefflow_user -d chefflow
```

## Architecture

### Core Structure

```
src/
├── main.ts                    # Application entry point with shutdown hooks
├── app.module.ts              # Root module - registers all providers
├── app.controller.ts          # Root controller with health endpoints
├── app.service.ts             # Root service
├── prisma/prisma.service.ts   # Prisma client with lifecycle hooks
├── auth/                      # Authentication module
│   ├── auth.module.ts         # Auth module configuration
│   ├── auth.service.ts        # Auth business logic (register, login, OAuth)
│   ├── auth.controller.ts     # Auth endpoints (register, login, profile, OAuth)
│   ├── strategies/            # Passport strategies
│   │   ├── jwt.strategy.ts    # JWT authentication strategy
│   │   └── google.strategy.ts # Google OAuth2 strategy
│   ├── guards/                # Route guards
│   │   ├── jwt-auth.guard.ts  # JWT protection guard
│   │   └── google-oauth.guard.ts # Google OAuth guard
│   ├── decorators/            # Custom decorators
│   │   ├── public.decorator.ts     # Mark endpoints as public
│   │   └── current-user.decorator.ts # Extract user from request
│   └── dto/                   # Data transfer objects
│       ├── register.dto.ts
│       ├── login.dto.ts
│       └── oauth-user.dto.ts
└── users/                     # User management module
    ├── users.service.ts
    ├── users.controller.ts
    └── entities/user.entity.ts # User entity with @Exclude decorators
```

### Database Layer (Prisma)

- **PrismaService** (`src/prisma/prisma.service.ts`): Singleton service that extends PrismaClient
  - Implements `OnModuleInit` to connect on app startup
  - Implements `OnModuleDestroy` to gracefully disconnect on shutdown
  - Registered as global provider in `AppModule`
  - Inject into any service/controller that needs database access

- **Schema Location**: `prisma/schema.prisma`
  - Single `User` model with hybrid authentication support
  - Uses `username` as primary key (unique identifier)
  - Supports multiple auth providers: LOCAL, GOOGLE, APPLE, GITHUB
  - Index on `[provider, providerId]` for OAuth user lookups
  - Index on `createdAt` for sorting queries
  - `passwordHash` is nullable (null for OAuth users)
  - Uses PostgreSQL as datasource

### Authentication System

The application implements a **hybrid authentication system** supporting both traditional credentials and OAuth2:

#### JWT Authentication (LOCAL Provider)

1. **Registration Flow** (`POST /auth/register`):
   - User provides username, email, password, name
   - Password is hashed with bcrypt (10 rounds)
   - User created with `provider: LOCAL`
   - JWT token generated and returned

2. **Login Flow** (`POST /auth/login`):
   - User provides username and password
   - Password verified with bcrypt
   - JWT token generated and returned

3. **Protected Endpoints**:
   - Use `@UseGuards(JwtAuthGuard)` or rely on global JWT guard
   - JWT validated on every request
   - User extracted via `@CurrentUser()` decorator

#### OAuth2 Authentication (Google Provider)

1. **OAuth Initiation** (`GET /auth/google`):
   - Protected by `@UseGuards(GoogleOAuthGuard)`
   - Redirects to Google OAuth consent page
   - Includes `client_id`, `redirect_uri`, `scope` (email, profile)

2. **OAuth Callback** (`GET /auth/google/callback`):
   - Google redirects back with authorization code
   - GoogleStrategy validates user with Google
   - Three scenarios handled:
     - **Existing OAuth user**: Returns user by `provider` + `providerId`
     - **Existing LOCAL user**: Links OAuth account to LOCAL user by email
     - **New user**: Creates user with auto-generated username from email
   - JWT token generated and returned in cookie
   - Redirects to frontend with token

3. **Account Linking**:
   - If user exists with same email but different provider, OAuth account is linked
   - Provider and providerId updated to OAuth values
   - Preserves existing user data (username, name, image if not provided)

4. **Username Generation**:
   - Base username extracted from email: `test.user+tag@example.com` → `test_user_tag`
   - Special characters replaced with underscores
   - If username taken, appends counter: `username1`, `username2`, etc.

#### Public vs Protected Routes

- **Public routes** (marked with `@Public()` decorator):
  - `/health` - Liveness probe
  - `/ready` - Readiness probe
  - `/auth/register` - User registration
  - `/auth/login` - User login
  - `/auth/google` - OAuth initiation
  - `/auth/google/callback` - OAuth callback

- **Protected routes** (require JWT):
  - `/auth/profile` - Get current user profile
  - Any route not marked with `@Public()`

### Health Checks

The application provides two health check endpoints (`src/app.controller.ts`):

1. **`GET /health`** - Liveness probe
   - Returns `200 OK` with `{status: "ok", timestamp: "..."}` if application is running
   - Used by Docker and orchestrators to restart unhealthy containers
   - Does NOT check database connectivity

2. **`GET /ready`** - Readiness probe
   - Returns `200 OK` with `{status: "ready", database: "connected", timestamp: "..."}` if application AND database are ready
   - Returns `503 Service Unavailable` if database is unreachable
   - Used by load balancers to route traffic only to healthy instances
   - Executes `SELECT 1` query to verify database connection

### Docker Architecture

**Multi-stage Dockerfile**:
- `base`: Node 20 slim + OpenSSL + pnpm setup
- `dependencies`: Dependency installation with frozen lockfile
- `development`: Hot-reload enabled (target for local dev on port 4000)
- `build`: TypeScript compilation + Prisma generation
- `production`: Optimized final image with non-root user (port 4000)

**Docker Compose Services**:
- `postgres`: PostgreSQL 16 with health checks and persistent volume (`postgres_data`)
- `app`: Production build on port 4000 (auto-runs `prisma migrate deploy` on startup)
- `app-dev`: Development build on port 4000 with volume mounts (requires `--profile dev`)

**Important Docker Details**:
- Uses `service_healthy` condition to ensure database is ready before app starts
- Automatically runs `pnpm prisma migrate deploy` on production container startup
- Health check runs every 30s using `healthcheck.js` script
- Database connection uses service name `postgres:5432` not `localhost`
- Development uses volume mounts for hot-reload: `.:/app` with excluded `node_modules`
- pnpm cache persisted in named volume: `pnpm-cache`

**Docker Troubleshooting**:
- **New dependencies not installing**: Remove pnpm-cache volume and rebuild:
  ```bash
  pnpm run docker:down
  docker volume rm chefflow-api_pnpm-cache
  docker-compose build --no-cache app-dev
  pnpm run docker:dev
  ```
  See `DOCKER.md` for detailed troubleshooting guide.

### Configuration

- **Environment Variables**: Defined in `.env` (use `.env.example` as template)
  - `DATABASE_URL`: PostgreSQL connection string
  - `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`: Docker PostgreSQL credentials
  - `NODE_ENV`: Environment mode (`development`, `production`)
  - `PORT`: Application port (default 4000)
  - `JWT_SECRET`, `JWT_EXPIRES_IN`: JWT authentication config (7d default)
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`: Google OAuth credentials
  - `FRONTEND_URL`: Frontend URL for OAuth redirects (default: http://localhost:5173)
  - `ALLOWED_ORIGINS`: Comma-separated CORS origins
  - `THROTTLE_TTL`: Rate limiting time window in seconds (default 60)
  - `THROTTLE_LIMIT`: Max requests per TTL window (default 10)
  - `HEALTH_CHECK_TIMEOUT`: Health check timeout in milliseconds (default 5000)

- **TypeScript Config**: Uses `moduleResolution: "node"` for pnpm + Prisma compatibility

### Security Features

The application includes several security layers:

1. **Helmet**: HTTP security headers protection (Content-Security-Policy, X-Frame-Options, etc.)
2. **CORS**: Configurable cross-origin resource sharing via `ALLOWED_ORIGINS`
3. **Rate Limiting**: Global throttling via `@nestjs/throttler`
   - Default: 10 requests per 60 seconds
   - Applied to all endpoints automatically
   - Can be customized per endpoint or skipped
4. **Validation**: Global validation pipe with class-validator
   - Strips unknown properties (`whitelist: true`)
   - Rejects requests with invalid properties (`forbidNonWhitelisted: true`)
   - Auto-transforms payloads to DTO types (`transform: true`)
5. **Password Hashing**: bcrypt with 10 rounds for LOCAL users
6. **OAuth Email Verification**: Only accepts verified emails from Google
7. **Data Exclusion**: UserEntity uses `@Exclude()` decorator to hide `passwordHash` in responses

### Lifecycle Management

- **Shutdown Hooks Enabled** (`main.ts`): Calls `app.enableShutdownHooks()`
  - Critical for clean Prisma disconnection in Docker
  - Triggers `OnModuleDestroy` lifecycle hook when app receives SIGTERM/SIGINT
  - Ensures graceful shutdown of database connections

## Development Workflow

### Adding Database Changes

1. Modify `prisma/schema.prisma`
2. Run `pnpm run prisma:generate` to regenerate client types
3. Create migration: `pnpm run prisma:migrate` (or in Docker: `docker-compose exec app-dev pnpm prisma migrate dev --name migration_name`)
4. Migration files are stored in `prisma/migrations/`
5. Update affected services/DTOs to use new schema

### Adding New OAuth Providers

To add a new OAuth provider (e.g., GitHub, Apple):

1. **Update Prisma Schema**: Provider enum already includes GITHUB and APPLE
2. **Install Passport Strategy**: `pnpm add passport-github2` or `pnpm add @arendajaelu/nestjs-passport-apple`
3. **Create Strategy**: `src/auth/strategies/github.strategy.ts` following `google.strategy.ts` pattern
4. **Create Guard**: `src/auth/guards/github-oauth.guard.ts` following `google-oauth.guard.ts` pattern
5. **Add Environment Variables**: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL`
6. **Register in AuthModule**: Add strategy to `providers` array in `auth.module.ts`
7. **Add Controller Endpoints**: Add `/auth/github` and `/auth/github/callback` routes
8. **Write Tests**: Create strategy tests and e2e tests following OAuth test patterns

### Working with Docker

- Use `app-dev` service for development with hot-reload (port 4000)
- Production migrations run automatically via command override in docker-compose.yml
- Access Prisma Studio in container: `docker-compose exec app-dev pnpm prisma studio`
- Direct database access: `docker-compose exec postgres psql -U chefflow_user -d chefflow`
- View real-time logs: `docker-compose logs -f app-dev`

### Testing Strategy

The project has comprehensive test coverage:

- **Unit Tests** (`*.spec.ts`): Test individual components in isolation
  - Located alongside source files
  - Run with `pnpm run test`
  - 117 unit tests covering services, controllers, guards, strategies

- **E2E Tests** (`test/*.e2e-spec.ts`): Test complete request/response flows
  - Located in `test/` directory
  - Run with `pnpm run test:e2e`
  - 22 e2e tests covering health checks, auth flows, OAuth flows

- **Test Utilities**:
  - Mock services with `jest.fn()`
  - Use `Test.createTestingModule()` for unit tests
  - Use `supertest` for e2e HTTP requests
  - Clean up test data in `afterEach` hooks

### Testing Database Connectivity

```bash
# Test readiness endpoint
curl http://localhost:4000/ready

# Stop database to test failure handling
docker-compose stop postgres

# Should return 503
curl -i http://localhost:4000/ready

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

### Authentication Patterns

#### Protecting Routes

```typescript
// JWT protection (default for all routes)
@Get('profile')
@UseGuards(JwtAuthGuard)
getProfile(@CurrentUser() user: User) {
  return new UserEntity(user);
}

// Make route public
@Public()
@Post('login')
login(@Body() loginDto: LoginDto) {
  return this.authService.login(loginDto);
}

// OAuth protection
@Public()
@Get('google')
@UseGuards(GoogleOAuthGuard)
async googleAuth() {}
```

#### Getting Current User

```typescript
@Get('profile')
getProfile(@CurrentUser() user: User) {
  // user is automatically injected from JWT payload
  return new UserEntity(user);
}
```

#### OAuth User Validation

The `validateOAuthUser` method in `AuthService` handles three scenarios:
1. Existing OAuth user (by provider + providerId)
2. Existing LOCAL user (link by email)
3. New user (create with auto-generated username)

```typescript
// In your strategy's validate method
const user = await this.authService.validateOAuthUser({
  provider: 'GOOGLE',
  providerId: profile.id,
  email: profile.emails[0].value,
  name: `${profile.name.givenName} ${profile.name.familyName}`,
  image: profile.photos[0]?.value,
});
```

### Health Check Pattern

- Always use `/ready` endpoint in production health checks (includes DB verification)
- Use `/health` for simple liveness probes that don't need DB connectivity
- Both endpoints are public (no authentication required)

### Module Registration

All new modules should be:
1. Added to `imports` array in `AppModule`
2. Include `PrismaService` in providers if database access is needed
3. Export services that need to be used by other modules

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

### Data Sanitization Pattern

Always use `UserEntity` when returning user data to exclude sensitive fields:

```typescript
import { UserEntity } from '../users/entities/user.entity';

async getProfile(user: User) {
  return new UserEntity(user); // Automatically excludes passwordHash
}
```

The `UserEntity` uses `@Exclude()` decorators from `class-transformer`:

```typescript
export class UserEntity {
  username!: string;
  email!: string;

  @Exclude()
  passwordHash?: string | null; // Hidden in responses

  name?: string | null;
  provider!: AuthProvider;
  // ...
}
```

### Docker Resource Management

Resource limits are configured in `docker-compose.yml`:
- **PostgreSQL**: 1 CPU, 1GB RAM (max), 256MB (reserved)
- **App (production)**: 1 CPU, 512MB RAM (max), 256MB (reserved)
- **App (dev)**: 1 CPU, 1GB RAM (max), 512MB (reserved)

Adjust these in the `deploy.resources` section based on your server capacity.

## Additional Documentation

- **DOCKER.md**: Comprehensive Docker setup, workflows, and troubleshooting
- **README.md**: Project overview and quick start guide
- **prisma/schema.prisma**: Database schema documentation with inline comments
