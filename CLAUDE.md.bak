# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development
```bash
pnpm run start:dev              # Start dev server with hot-reload (port 4000)
pnpm run build                  # Build the application
pnpm run start:prod             # Start production build
```

### Docker (Recommended)
```bash
pnpm run docker:build           # Build Docker images
pnpm run docker:up              # Start production containers
pnpm run docker:down            # Stop and remove containers
pnpm run docker:logs            # View application logs
pnpm run docker:restart         # Restart application container
```

### Testing
```bash
pnpm run test                   # Run all unit tests (175 tests)
pnpm run test:watch             # Run unit tests in watch mode
pnpm run test:cov               # Generate coverage report
pnpm run test:e2e               # Run e2e tests
pnpm run test -- <filename>     # Run specific test file
```

### Database (Prisma)
```bash
pnpm run prisma:generate        # Regenerate Prisma Client after schema changes
pnpm run prisma:migrate         # Create and apply new migration
pnpm run prisma:studio          # Open Prisma Studio GUI
```

### Code Quality
```bash
pnpm run lint                   # Run ESLint with auto-fix
pnpm run format                 # Format code with Prettier
```

## Architecture Overview

### Technology Stack
- **Framework**: NestJS 11.x with TypeScript 5.9+
- **Database**: PostgreSQL 16 with Prisma ORM 7.x
- **Authentication**: Hybrid JWT + OAuth2 (Google) with refresh tokens
- **Security**: Helmet, CORS, rate limiting (Throttler), input validation
- **Package Manager**: pnpm 10+
- **Runtime**: Node.js 24+

### Module Structure

The application follows NestJS modular architecture with clear separation of concerns:

**Core Modules:**
- `AuthModule` - Handles authentication (JWT + OAuth2), token management, account linking
- `UsersModule` - User management and CRUD operations
- `RecipesModule` - Recipe CRUD operations (base recipe data)
- `RecipeIngredientsModule` - Nested ingredient management (POST/PATCH/DELETE on `/recipes/:recipeId/ingredients`)
- `RecipeStepsModule` - Nested step management (POST/PATCH/DELETE on `/recipes/:recipeId/steps`)
- `PrismaModule` - Global database service (@Global decorator)
- `AppModule` - Root module with global guards and configuration

### Authentication Architecture

**Global Guards** (applied to all routes by default):
- `JwtAuthGuard` - JWT authentication (applied via APP_GUARD)
- `ThrottlerGuard` - Rate limiting protection

**Making Routes Public:**
Routes are protected by default. Use the `@Public()` decorator to bypass JWT authentication:
```typescript
@Public()
@Post('login')
async login() { }
```

**Authentication Flow:**
1. **Local Auth**: Register/Login → JWT access token (15m) + refresh token (7d) → stored in httpOnly cookies
2. **OAuth Flow**: Google OAuth → account linking if email exists → JWT tokens → redirect to frontend
3. **Token Refresh**: `/auth/refresh` endpoint uses refresh token to get new access token

**Cookie Configuration:**
- Development (NODE_ENV=development): secure=true, sameSite='none' (allows cross-origin with HTTPS)
- Production (NODE_ENV=production): secure=true, sameSite='lax' (same-site HTTPS only)

**Strategies:**
- `JwtStrategy` - Validates access tokens, extracts user from JWT payload
- `RefreshTokenStrategy` - Validates refresh tokens for token renewal
- `GoogleStrategy` - Handles Google OAuth2 flow

**Key Security Features:**
- Passwords hashed with bcrypt (10 rounds)
- Refresh tokens hashed before storing in database
- httpOnly cookies with environment-dependent secure flag (false in dev, true in prod)
- SameSite cookie protection (lax in prod, none in dev)
- Account linking: OAuth users can link to existing local accounts via email

### Database Schema (Prisma)

**User Model:**
- Primary key: `id` (auto-increment integer)
- Unique constraints: `username`, `email`
- Optional `passwordHash` (null for OAuth-only users)
- `provider` field: LOCAL, GOOGLE, APPLE, GITHUB (enum)
- `providerId` for OAuth users
- `hashedRefreshToken` for token refresh flow
- Relationship: one-to-many with Recipe
- Indexes: provider+providerId lookup

**Recipe Model:**
- Primary key: `id` (auto-increment integer)
- Foreign key: `userId` (references User)
- Fields: title, description, servings, prepTime, cookTime, imageUrl
- Relationships: belongs to User, has many RecipeIngredient and RecipeStep
- Cascade delete: recipes deleted when user is deleted
- Indexes: userId, createdAt

**RecipeIngredient Model:**
- Primary key: `id` (auto-increment integer)
- Foreign key: `recipeId` (references Recipe)
- Fields: ingredientName, quantity, unit (enum), notes, order
- Unit enum: GRAM, KILOGRAM, MILLILITER, LITER, TEASPOON, TABLESPOON, CUP, UNIT, PINCH, TO_TASTE
- Cascade delete: ingredients deleted when recipe is deleted
- Indexes: recipeId, ingredientName

**RecipeStep Model:**
- Primary key: `id` (auto-increment integer)
- Foreign key: `recipeId` (references Recipe)
- Fields: stepNumber, instruction (Text), duration
- Unique constraint: recipeId + stepNumber
- Cascade delete: steps deleted when recipe is deleted
- Indexes: recipeId

**Important**: Prisma 7 uses `prisma.config.ts` for configuration instead of environment variables in schema.prisma.

### Custom Decorators & Guards

**Decorators:**
- `@Public()` - Bypass JWT authentication (src/auth/decorators/public.decorator.ts)
- `@CurrentUser()` - Extract authenticated user from request (src/auth/decorators/current-user.decorator.ts)
  - Can extract specific fields: `@CurrentUser('id')` returns just the user ID
  - Without arguments, returns the entire user object

**Usage Pattern:**
```typescript
@Get('profile')
getProfile(@CurrentUser() user: User) {
  return new UserEntity(user);
}

// Extract specific field
@Get('recipes')
findAll(@CurrentUser('id') userId: number) {
  return this.recipesService.findAll(userId);
}
```

### Data Transformation

**Entity Pattern:**
- Use Entity classes (e.g., `UserEntity`, `RecipeEntity`) with `@Exclude()` decorator to remove sensitive fields
- Automatically applied via global `ClassSerializerInterceptor`
- Always return `new EntityClass(data)` from controllers to ensure proper serialization
- Example: `UserEntity` excludes passwordHash and hashedRefreshToken

### Validation & DTOs

**Global Validation Pipe** configured in main.ts:
- `whitelist: true` - Strip properties not in DTO
- `forbidNonWhitelisted: true` - Throw error for unknown properties
- `transform: true` - Automatically transform payloads to DTO instances
- Input validation uses class-validator decorators in DTOs

### Cookie Management

**Authentication Cookies:**
- `accessToken` - 15 minutes, path: `/`, httpOnly, secure (environment-dependent)
- `Refresh` - 7 days, path: `/auth/refresh`, httpOnly, secure (environment-dependent)
- secure: false in development (allows HTTP localhost), true in production (HTTPS only)
- SameSite: 'lax' in production, 'none' in development
- Cookies set via `setAuthCookies()` helper in AuthController

### Environment Configuration

**Required Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Access token secret (generate with: `openssl rand -base64 32`)
- `JWT_REFRESH_SECRET` - Refresh token secret
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - For OAuth
- `FRONTEND_URL` - OAuth redirect destination
- `ALLOWED_ORIGINS` - Comma-separated CORS origins

**Optional:**
- `PORT` (default: 3000, typically use 4000 in dev)
- `NODE_ENV` (production or development, affects cookie SameSite and CSP)
- `THROTTLE_TTL` (default: 60000ms / 60 seconds)
- `THROTTLE_LIMIT` (default: 10 requests per TTL)
- `JWT_EXPIRES_IN` (default: 15m for access tokens)

### Testing Patterns

**Unit Tests:**
- Located alongside source files as `*.spec.ts`
- Mock PrismaService, JwtService, ConfigService
- Test services, controllers, guards, strategies, decorators independently

**E2E Tests:**
- Located in `/test/*.e2e-spec.ts`
- Use `supertest` for HTTP assertions
- Test complete authentication flows (register, login, OAuth, token refresh)

**Running Specific Tests:**
```bash
pnpm run test -- users.service.spec.ts
pnpm run test:e2e -- auth-oauth.e2e-spec.ts
pnpm run test -- --testNamePattern="should create user"
```

## Development Patterns

### Adding New Protected Endpoints

1. Endpoints are protected by default (JwtAuthGuard is global)
2. Use `@CurrentUser()` decorator to access authenticated user
3. No need to add guards unless using specific ones (e.g., GoogleOAuthGuard)

```typescript
@Get('protected')
async protectedRoute(@CurrentUser() user: User) {
  // User is already authenticated
}
```

### Adding Public Endpoints

Use `@Public()` decorator to bypass authentication:

```typescript
@Public()
@Get('public')
async publicRoute() {
  // No authentication required
}
```

### Adding OAuth Providers

1. Install passport strategy (e.g., `passport-github2`)
2. Create strategy in `src/auth/strategies/` implementing `PassportStrategy`
3. Add provider to `AuthProvider` enum in schema.prisma
4. Create guard in `src/auth/guards/`
5. Add routes in AuthController for initiation and callback
6. Update `validateOAuthUser()` in AuthService for account linking

### Working with User-Owned Resources

When creating endpoints for user-owned resources (like recipes):

1. Use `@CurrentUser('id')` to extract user ID from the authenticated user
2. Pass userId to service methods to enforce ownership
3. Service layer should validate ownership before returning or modifying data
4. Throw `NotFoundException` if resource doesn't exist
5. Throw `ForbiddenException` if user doesn't own the resource

```typescript
// Controller
@Get(':id')
async findOne(
  @CurrentUser('id') userId: number,
  @Param('id', ParseIntPipe) id: number,
): Promise<RecipeEntity> {
  const recipe = await this.recipesService.findOne(userId, id);
  return new RecipeEntity(recipe);
}

// Service
async findOne(userId: number, recipeId: number) {
  const recipe = await this.prisma.recipe.findUnique({
    where: { id: recipeId },
  });

  if (!recipe) {
    throw new NotFoundException(`Recipe with ID ${recipeId} not found`);
  }

  if (recipe.userId !== userId) {
    throw new ForbiddenException('You do not have access to this recipe');
  }

  return recipe;
}
```

### Database Migrations

After modifying `prisma/schema.prisma`:

```bash
pnpm run prisma:generate        # Regenerate Prisma Client types
pnpm run prisma:migrate         # Create migration and apply
```

**Important**: Always regenerate Prisma Client before running tests or starting the app.

### Health Checks

Two endpoints for monitoring:
- `GET /health` - Liveness probe (app running)
- `GET /ready` - Readiness probe (app + database ready)

## Docker & Deployment

### Multi-Stage Docker Build

The Dockerfile uses an optimized 2-stage build process for production deployments:

**Stage 1 - Builder** (`FROM node:24-slim AS builder`):
- Installs all dependencies (dev + production)
- Copies source code and Prisma schema
- Generates Prisma Client
- Compiles TypeScript to JavaScript
- Validates build output exists: `dist/src/main.js`

**Stage 2 - Runtime** (`FROM node:24-slim`):
- Minimal production image
- Installs dumb-init for proper signal handling
- Creates non-root user (`nestjs:nestjs`)
- Copies entire `/app` from builder (includes node_modules and compiled code)
- Uses `ENTRYPOINT ["dumb-init", "--"]` for graceful shutdown
- Runs `entrypoint.sh` which executes migrations and starts the app

**Key Benefits**:
- Better security (no dev tools in production, runs as non-root user)
- Faster rebuilds (layer caching optimization)
- Proper signal handling for VPS/container orchestration with dumb-init

**Important Note**: The current `entrypoint.sh` runs migrations automatically on startup. For production with multiple replicas, consider running migrations separately before deployment to avoid race conditions.

### Production Deployment Best Practices

**Pre-Deployment Checklist**:
1. Run database migrations BEFORE deploying new containers
2. Verify all required environment variables are set
3. Test build locally: `pnpm run docker:build && pnpm run docker:up`
4. Ensure health check endpoints are accessible

**Database Migrations Strategy**:
- Current setup: `entrypoint.sh` runs migrations automatically on startup
- For single-instance deployments: Current approach is fine
- For multi-replica production: Run migrations separately before deployment
  - Use: `npx prisma migrate deploy` (production-safe, no prompts)
  - Remove migration logic from `entrypoint.sh`
  - Prevents race conditions when multiple containers start simultaneously
- Migrations are forward-only (no automatic rollback)

**Resource Recommendations for VPS**:
- Minimum: 512MB RAM, 1 CPU core
- Recommended: 1GB RAM, 2 CPU cores
- Monitor with health checks: `/health` (liveness), `/ready` (readiness)

**Environment Variables for Production**:
```bash
NODE_ENV=production          # Affects cookie SameSite and logging
DATABASE_URL=postgresql://...
JWT_SECRET=<strong-secret>
JWT_REFRESH_SECRET=<strong-secret>
ALLOWED_ORIGINS=https://your-domain.com
```

## Code Organization

```
src/
├── auth/                       # Authentication module
│   ├── decorators/            # @Public(), @CurrentUser()
│   ├── dto/                   # Login, Register, OAuth DTOs
│   ├── filters/               # Exception filters for auth
│   ├── guards/                # JWT, OAuth, Refresh guards
│   └── strategies/            # Passport strategies
├── users/                      # User management module
│   ├── dto/                   # Create/Update user DTOs
│   └── entities/              # UserEntity with @Exclude()
├── recipes/                    # Recipe management module
│   ├── dto/                   # Create/Update recipe DTOs
│   └── entities/              # RecipeEntity
├── recipe-ingredients/         # Recipe ingredients submodule
│   ├── dto/                   # Create/Update ingredient DTOs
│   ├── entities/              # RecipeIngredientEntity
│   └── recipe-ingredients.controller.ts  # Nested routes
├── recipe-steps/               # Recipe steps submodule
│   ├── dto/                   # Create/Update step DTOs
│   ├── entities/              # RecipeStepEntity
│   └── recipe-steps.controller.ts       # Nested routes
├── prisma/                     # Database service (global)
├── common/                     # Shared utilities
│   └── middleware/            # CSRF, etc.
└── main.ts                    # Bootstrap, global pipes/interceptors

prisma/
├── schema.prisma              # Database schema
└── migrations/                # Migration history

.claude/
└── rules/                     # Development patterns and standards
    ├── api-design.md         # RESTful conventions, status codes
    ├── nestjs-patterns.md    # Service/controller rules
    ├── security.md           # Auth, validation, cookies
    └── typescript.md         # Type safety, decorators

prisma.config.ts               # Prisma 7 configuration (root level)
Dockerfile                      # 2-stage production build
entrypoint.sh                   # Startup script (migrations + app)
test/                           # E2E tests
```

## Common Issues & Solutions

### Prisma Client Out of Sync
If you see "Prisma Client does not match schema" errors:
```bash
pnpm run prisma:generate
```

### Test Database Issues
E2E tests expect PostgreSQL running. Ensure DATABASE_URL is set correctly.

### OAuth Redirect Issues
- Verify `GOOGLE_CALLBACK_URL` matches Google Console settings
- Check `FRONTEND_URL` for post-auth redirects
- Ensure `ALLOWED_ORIGINS` includes frontend URL

### Cookie Issues in Development
- Cookies use SameSite='none' and secure=false in development (allows HTTP localhost)
- Frontend must use `credentials: 'include'` in fetch/axios
- For deployed dev backend with local frontend, ensure backend has NODE_ENV=development

## Development Standards

**See `.claude/rules/` for comprehensive patterns:**
- `api-design.md` - RESTful conventions, HTTP methods, status codes, cookie-based auth flow
- `nestjs-patterns.md` - Service/controller rules, module organization, DTOs, Entity pattern
- `security.md` - Authentication, password handling, cookie security, input validation
- `typescript.md` - Type safety, decorators, import organization, null safety

## Important Notes

- **Global Guards**: JWT authentication is applied globally. Routes are protected by default.
- **PrismaService**: Marked @Global, available in all modules without importing PrismaModule
- **Password Handling**: Never expose `passwordHash` or `hashedRefreshToken` - use Entity classes
- **User Primary Key**: User model uses auto-increment `id` as primary key (not username)
- **Account Linking**: OAuth users automatically link to existing accounts with matching email
- **Token Expiry**: Access tokens: 15m, Refresh tokens: 7d (configurable)
- **Rate Limiting**: Default 10 requests per 60 seconds (affects all routes)
- **Cascade Deletes**: Recipes and related entities (ingredients, steps) are cascade-deleted when user is deleted
- **Recipe Ownership**: All recipe operations validate user ownership via userId foreign key
- **Nested Routes**: Ingredients and steps use nested routes (`/recipes/:recipeId/ingredients`, `/recipes/:recipeId/steps`) with separate modules

<!-- autoskills:start -->

Summary generated by `autoskills`. Check the full files inside `.claude/skills`.

## NestJS Best Practices

NestJS best practices and architecture patterns for building production-ready applications. This skill should be used when writing, reviewing, or refactoring NestJS code to ensure proper patterns for modules, dependency injection, security, and performance.

- `.claude/skills/nestjs-best-practices/SKILL.md`
- `.claude/skills/nestjs-best-practices/AGENTS.md`: **Version 1.1.0** NestJS Best Practices January 2026
- `.claude/skills/nestjs-best-practices/README.md`: 📖 [For Humans <3](https://kadajett.github.io/agent-nestjs-skills/)
- `.claude/skills/nestjs-best-practices/rules/_sections.md`: This file defines all sections, their ordering, impact levels, and descriptions. The section ID (in parentheses) is the filename prefix used to group rules.
- `.claude/skills/nestjs-best-practices/rules/_template.md`: **Impact: MEDIUM (optional impact description)**
- `.claude/skills/nestjs-best-practices/rules/api-use-dto-serialization.md`: Never return entity objects directly from controllers. Use response DTOs with class-transformer's `@Exclude()` and `@Expose()` decorators to control exactly what data is sent to clients. This prevents accidental exposure of sensitive fields and provides a stable API contract.
- `.claude/skills/nestjs-best-practices/rules/api-use-interceptors.md`: Interceptors can transform responses, add logging, handle caching, and measure performance without polluting your business logic. They wrap the route handler execution, giving you access to both the request and response streams.
- `.claude/skills/nestjs-best-practices/rules/api-use-pipes.md`: Use built-in pipes like `ParseIntPipe`, `ParseUUIDPipe`, and `DefaultValuePipe` for common transformations. Create custom pipes for business-specific transformations. Pipes separate validation/transformation logic from controllers.
- `.claude/skills/nestjs-best-practices/rules/api-versioning.md`: Use NestJS built-in versioning when making breaking changes to your API. Choose a versioning strategy (URI, header, or media type) and apply it consistently. This allows old clients to continue working while new clients use updated endpoints.
- `.claude/skills/nestjs-best-practices/rules/arch-avoid-circular-deps.md`: Circular dependencies occur when Module A imports Module B, and Module B imports Module A (directly or transitively). NestJS can sometimes resolve these through forward references, but they indicate architectural problems and should be avoided. This is the #1 cause of runtime crashes in NestJS ap...
- `.claude/skills/nestjs-best-practices/rules/arch-feature-modules.md`: Organize your application into feature modules that encapsulate related functionality. Each feature module should be self-contained with its own controllers, services, entities, and DTOs. Avoid organizing by technical layer (all controllers together, all services together). This enables 3-5x fast...
- `.claude/skills/nestjs-best-practices/rules/arch-module-sharing.md`: NestJS modules are singletons by default. When a service is properly exported from a module and that module is imported elsewhere, the same instance is shared. However, providing a service in multiple modules creates separate instances, leading to memory waste, state inconsistency, and confusing...
- `.claude/skills/nestjs-best-practices/rules/arch-single-responsibility.md`: Each service should have a single, well-defined responsibility. Avoid "god services" that handle multiple unrelated concerns. If a service name includes "And" or handles more than one domain concept, it likely violates single responsibility. This reduces complexity and improves testability by 40%+.
- `.claude/skills/nestjs-best-practices/rules/arch-use-events.md`: Use `@nestjs/event-emitter` for intra-service events and message brokers for inter-service communication. Events allow modules to react to changes without direct dependencies, improving modularity and enabling async processing.
- `.claude/skills/nestjs-best-practices/rules/arch-use-repository-pattern.md`: Create custom repositories to encapsulate complex queries and database logic. This keeps services focused on business logic, makes testing easier with mock repositories, and allows changing database implementations without affecting business code.
- `.claude/skills/nestjs-best-practices/rules/db-avoid-n-plus-one.md`: N+1 queries occur when you fetch a list of entities, then make an additional query for each entity to load related data. Use eager loading with `relations`, query builder joins, or DataLoader to batch queries efficiently.
- `.claude/skills/nestjs-best-practices/rules/db-use-migrations.md`: Never use `synchronize: true` in production. Use migrations for all schema changes. Migrations provide version control for your database, enable safe rollbacks, and ensure consistency across all environments.
- `.claude/skills/nestjs-best-practices/rules/db-use-transactions.md`: When multiple database operations must succeed or fail together, wrap them in a transaction. This prevents partial updates that leave your data in an inconsistent state. Use TypeORM's transaction APIs or the DataSource query runner for complex scenarios.
- `.claude/skills/nestjs-best-practices/rules/devops-graceful-shutdown.md`: Handle SIGTERM and SIGINT signals to gracefully shutdown your NestJS application. Stop accepting new requests, wait for in-flight requests to complete, close database connections, and clean up resources. This prevents data loss and connection errors during deployments.
- `.claude/skills/nestjs-best-practices/rules/devops-use-config-module.md`: Use `@nestjs/config` for environment-based configuration. Validate configuration at startup to fail fast on misconfigurations. Use namespaced configuration for organization and type safety.
- `.claude/skills/nestjs-best-practices/rules/devops-use-logging.md`: Use NestJS Logger with structured JSON output in production. Include contextual information (request ID, user ID, operation) to trace requests across services. Avoid console.log and implement proper log levels.
- `.claude/skills/nestjs-best-practices/rules/di-avoid-service-locator.md`: Avoid using `ModuleRef.get()` or global containers to resolve dependencies at runtime. This hides dependencies, makes code harder to test, and breaks the benefits of dependency injection. Use constructor injection instead.
- `.claude/skills/nestjs-best-practices/rules/di-interface-segregation.md`: Clients should not be forced to depend on interfaces they don't use. In NestJS, this means keeping interfaces small and focused on specific capabilities rather than creating "fat" interfaces that bundle unrelated methods. When a service only needs to send emails, it shouldn't depend on an interfa...
- `.claude/skills/nestjs-best-practices/rules/di-liskov-substitution.md`: Subtypes must be substitutable for their base types without altering program correctness. In NestJS with dependency injection, this means any implementation of an interface or abstract class must honor the contract completely. A mock payment service used in tests must behave like a real payment s...
- `.claude/skills/nestjs-best-practices/rules/di-prefer-constructor-injection.md`: Always use constructor injection over property injection. Constructor injection makes dependencies explicit, enables TypeScript type checking, ensures dependencies are available when the class is instantiated, and improves testability. This is required for proper DI, testing, and TypeScript support.
- `.claude/skills/nestjs-best-practices/rules/di-scope-awareness.md`: NestJS has three provider scopes: DEFAULT (singleton), REQUEST (per-request instance), and TRANSIENT (new instance for each injection). Most providers should be singletons. Request-scoped providers have performance implications as they bubble up through the dependency tree. Understanding scopes p...
- `.claude/skills/nestjs-best-practices/rules/di-use-interfaces-tokens.md`: TypeScript interfaces are erased at compile time and can't be used as injection tokens. Use string tokens, symbols, or abstract classes when you want to inject implementations of interfaces. This enables swapping implementations for testing or different environments.
- `.claude/skills/nestjs-best-practices/rules/error-handle-async-errors.md`: NestJS automatically catches errors from async route handlers, but errors from background tasks, event handlers, and manually created promises can crash your application. Always handle async errors explicitly and use global handlers as a safety net.
- `.claude/skills/nestjs-best-practices/rules/error-throw-http-exceptions.md`: It's acceptable (and often preferable) to throw `HttpException` subclasses from services in HTTP applications. This keeps controllers thin and allows services to communicate appropriate error states. For truly layer-agnostic services, use domain exceptions that map to HTTP status codes.
- `.claude/skills/nestjs-best-practices/rules/error-use-exception-filters.md`: Never catch exceptions and manually format error responses in controllers. Use NestJS exception filters to handle errors consistently across your application. Create custom exception filters for specific error types and a global filter for unhandled exceptions.
- `.claude/skills/nestjs-best-practices/rules/micro-use-health-checks.md`: Implement liveness and readiness probes using `@nestjs/terminus`. Liveness checks determine if the service should be restarted. Readiness checks determine if the service can accept traffic. Proper health checks enable Kubernetes and load balancers to route traffic correctly.
- `.claude/skills/nestjs-best-practices/rules/micro-use-patterns.md`: NestJS microservices support two communication patterns: request-response (MessagePattern) and event-based (EventPattern). Use MessagePattern when you need a response, and EventPattern for fire-and-forget notifications. Understanding the difference prevents communication bugs.
- `.claude/skills/nestjs-best-practices/rules/micro-use-queues.md`: Use `@nestjs/bullmq` for background job processing. Queues decouple long-running tasks from HTTP requests, enable retry logic, and distribute workload across workers. Use them for emails, file processing, notifications, and any task that shouldn't block user requests.
- `.claude/skills/nestjs-best-practices/rules/perf-async-hooks.md`: NestJS lifecycle hooks (`onModuleInit`, `onApplicationBootstrap`, etc.) support async operations. However, misusing them can block application startup or cause race conditions. Understand the lifecycle order and use hooks appropriately.
- `.claude/skills/nestjs-best-practices/rules/perf-lazy-loading.md`: NestJS supports lazy-loading modules, which defers initialization until first use. This is valuable for large applications where some features are rarely used, serverless deployments where cold start time matters, or when certain modules have heavy initialization costs.
- `.claude/skills/nestjs-best-practices/rules/perf-optimize-database.md`: Select only needed columns, use proper indexes, avoid over-fetching relations, and consider query performance when designing your data access. Most API slowness traces back to inefficient database queries.
- `.claude/skills/nestjs-best-practices/rules/perf-use-caching.md`: Implement caching for expensive operations, frequently accessed data, and external API calls. Use NestJS CacheModule with appropriate TTLs and cache invalidation strategies. Don't cache everything - focus on high-impact areas.
- `.claude/skills/nestjs-best-practices/rules/security-auth-jwt.md`: Use `@nestjs/jwt` with `@nestjs/passport` for authentication. Store secrets securely, use appropriate token lifetimes, implement refresh tokens, and validate tokens properly. Never expose sensitive data in JWT payloads.
- `.claude/skills/nestjs-best-practices/rules/security-rate-limiting.md`: Use `@nestjs/throttler` to limit request rates per client. Apply different limits for different endpoints - stricter for auth endpoints, more relaxed for read operations. Consider using Redis for distributed rate limiting in clustered deployments.
- `.claude/skills/nestjs-best-practices/rules/security-sanitize-output.md`: While NestJS APIs typically return JSON (which browsers don't execute), XSS risks exist when rendering HTML, storing user content, or when frontend frameworks improperly handle API responses. Sanitize user-generated content before storage and use proper Content-Type headers.
- `.claude/skills/nestjs-best-practices/rules/security-use-guards.md`: Guards determine whether a request should be handled based on authentication state, roles, permissions, or other conditions. They run after middleware but before pipes and interceptors, making them ideal for access control. Use guards instead of manual checks in controllers.
- `.claude/skills/nestjs-best-practices/rules/security-validate-all-input.md`: Always validate incoming data using class-validator decorators on DTOs and the global ValidationPipe. Never trust user input. Validate all request bodies, query parameters, and route parameters before processing.
- `.claude/skills/nestjs-best-practices/rules/test-e2e-supertest.md`: End-to-end tests use Supertest to make real HTTP requests against your NestJS application. They test the full stack including middleware, guards, pipes, and interceptors. E2E tests catch integration issues that unit tests miss.
- `.claude/skills/nestjs-best-practices/rules/test-mock-external-services.md`: Never call real external services (APIs, databases, message queues) in unit tests. Mock them to ensure tests are fast, deterministic, and don't incur costs. Use realistic mock data and test edge cases like timeouts and errors.
- `.claude/skills/nestjs-best-practices/rules/test-use-testing-module.md`: Use `@nestjs/testing` module to create isolated test environments with mocked dependencies. This ensures your tests run fast, don't depend on external services, and properly test your business logic in isolation.

## Node.js Backend Patterns

Build production-ready Node.js backend services with Express/Fastify, implementing middleware patterns, error handling, authentication, database integration, and API design best practices. Use when creating Node.js servers, REST APIs, GraphQL backends, or microservices architectures.

- `.claude/skills/nodejs-backend-patterns/SKILL.md`
- `.claude/skills/nodejs-backend-patterns/references/advanced-patterns.md`: Advanced patterns for dependency injection, database integration, authentication, caching, and API response formatting.

## Node.js Best Practices

Node.js development principles and decision-making. Framework selection, async patterns, security, and architecture. Teaches thinking, not copying.

- `.claude/skills/nodejs-best-practices/SKILL.md`

## Prisma CLI Reference

Prisma CLI commands reference covering all available commands, options, and usage patterns. Use when running Prisma CLI commands, setting up projects, generating client, running migrations, managing databases, or starting Prisma's MCP server. Triggers on "prisma init", "prisma generate", "prisma...

- `.claude/skills/prisma-cli/SKILL.md`
- `.claude/skills/prisma-cli/references/db-execute.md`: Execute native commands (SQL) to your database.
- `.claude/skills/prisma-cli/references/db-pull.md`: Introspects an existing database and updates your Prisma schema to reflect its structure.
- `.claude/skills/prisma-cli/references/db-push.md`: Pushes schema changes directly to database without creating migrations. Ideal for prototyping.
- `.claude/skills/prisma-cli/references/db-seed.md`: Runs your database seed script to populate data.
- `.claude/skills/prisma-cli/references/debug.md`: Prints information helpful for debugging and bug reports.
- `.claude/skills/prisma-cli/references/dev.md`: Starts a local Prisma Postgres database for development. Provides a PostgreSQL-compatible database that runs entirely on your machine.
- `.claude/skills/prisma-cli/references/format.md`: Formats your Prisma schema file.
- `.claude/skills/prisma-cli/references/generate.md`: Generates assets based on the generator blocks in your Prisma schema, most commonly Prisma Client.
- `.claude/skills/prisma-cli/references/init.md`: Bootstraps a fresh Prisma ORM project in the current directory.
- `.claude/skills/prisma-cli/references/mcp.md`: Starts Prisma's MCP server for AI development tools.
- `.claude/skills/prisma-cli/references/migrate-deploy.md`: Applies pending migrations in production/staging environments.
- `.claude/skills/prisma-cli/references/migrate-dev.md`: Creates and applies migrations during development. Requires a shadow database.
- `.claude/skills/prisma-cli/references/migrate-diff.md`: Compares database schemas and generates diffs (SQL or summary).
- `.claude/skills/prisma-cli/references/migrate-reset.md`: Resets your database and re-applies all migrations.
- `.claude/skills/prisma-cli/references/migrate-resolve.md`: Resolves issues with database migrations, such as failed migrations or baselining.
- `.claude/skills/prisma-cli/references/migrate-status.md`: Checks the status of your database migrations.
- `.claude/skills/prisma-cli/references/studio.md`: Opens a visual database browser for viewing and editing data.
- `.claude/skills/prisma-cli/references/validate.md`: Validates your Prisma schema file.

## Prisma Client API Reference

Prisma Client API reference covering model queries, filters, operators, and client methods. Use when writing database queries, using CRUD operations, filtering data, or configuring Prisma Client. Triggers on "prisma query", "findMany", "create", "update", "delete", "$transaction".

- `.claude/skills/prisma-client-api/SKILL.md`
- `.claude/skills/prisma-client-api/references/client-methods.md`: Prisma Client instance methods.
- `.claude/skills/prisma-client-api/references/constructor.md`: Configure Prisma Client when instantiating.
- `.claude/skills/prisma-client-api/references/filters.md`: Filter operators for the `where` clause.
- `.claude/skills/prisma-client-api/references/model-queries.md`: CRUD operations for your Prisma models.
- `.claude/skills/prisma-client-api/references/query-options.md`: Options for controlling query behavior.
- `.claude/skills/prisma-client-api/references/raw-queries.md`: Execute raw SQL when Prisma's query API isn't sufficient.
- `.claude/skills/prisma-client-api/references/relations.md`: Query and modify related records.
- `.claude/skills/prisma-client-api/references/transactions.md`: Execute multiple operations atomically.

## Prisma Database Setup

Guides for configuring Prisma with different database providers (PostgreSQL, MySQL, SQLite, MongoDB, etc.). Use when setting up a new project, changing databases, or troubleshooting connection issues. Triggers on "configure postgres", "connect to mysql", "setup mongodb", "sqlite setup".

- `.claude/skills/prisma-database-setup/SKILL.md`
- `.claude/skills/prisma-database-setup/references/cockroachdb.md`: Configure Prisma with CockroachDB.
- `.claude/skills/prisma-database-setup/references/mongodb.md`: MongoDB projects should stay on the latest Prisma 6.x release. Do not upgrade a MongoDB app to Prisma 7's SQL client path.
- `.claude/skills/prisma-database-setup/references/mysql.md`: Configure Prisma with MySQL (or MariaDB).
- `.claude/skills/prisma-database-setup/references/postgresql.md`: Configure Prisma with PostgreSQL.
- `.claude/skills/prisma-database-setup/references/prisma-client-setup.md`: Generate and instantiate Prisma Client for Prisma's standard SQL provider workflow. For MongoDB, follow the provider-specific notes in `references/mongodb.md` instead of copying the SQL adapter example below.
- `.claude/skills/prisma-database-setup/references/prisma-postgres.md`: Configure Prisma with Prisma Postgres (Managed).
- `.claude/skills/prisma-database-setup/references/sqlite.md`: Configure Prisma with SQLite.
- `.claude/skills/prisma-database-setup/references/sqlserver.md`: Configure Prisma with Microsoft SQL Server.

## Prisma Postgres

Prisma Postgres setup and operations guidance across Console, create-db CLI, Management API, and Management API SDK. Use when creating Prisma Postgres databases, working in Prisma Console, provisioning with create-db/create-pg/create-postgres, or integrating programmatic provisioning with service...

- `.claude/skills/prisma-postgres/SKILL.md`
- `.claude/skills/prisma-postgres/references/console-and-connections.md`: Use Prisma Console workflows for project visibility, data inspection, and connection setup.
- `.claude/skills/prisma-postgres/references/create-db-cli.md`: Use `create-db` for instant Prisma Postgres provisioning from the terminal.
- `.claude/skills/prisma-postgres/references/management-api-sdk.md`: Use `@prisma/management-api-sdk` for typed API integration with optional OAuth and token refresh.
- `.claude/skills/prisma-postgres/references/management-api.md`: Use Prisma Management API for programmatic provisioning and workspace/project/database management.

## TypeScript Advanced Types

Master TypeScript's advanced type system including generics, conditional types, mapped types, template literals, and utility types for building type-safe applications. Use when implementing complex type logic, creating reusable type utilities, or ensuring compile-time type safety in TypeScript pr...

- `.claude/skills/typescript-advanced-types/SKILL.md`

<!-- autoskills:end -->
