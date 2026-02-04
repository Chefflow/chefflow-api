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
