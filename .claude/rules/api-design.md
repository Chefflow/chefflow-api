---
paths: src/**/*.controller.ts
---

# API Design Standards

## RESTful Conventions

### Endpoint Naming
- Use plural nouns for resources: `/users`, `/recipes`
- Use kebab-case for multi-word resources: `/recipe-ingredients`
- Avoid verbs in URLs - use HTTP methods instead

### HTTP Methods
- **GET**: Retrieve resources (safe, idempotent)
- **POST**: Create new resources
- **PATCH**: Partial update existing resources
- **DELETE**: Remove resources
- **PUT**: Full replacement (rarely used in this project)

### Status Codes
- **200 OK**: Successful GET, PATCH
- **201 CREATED**: Successful POST with `@HttpCode(HttpStatus.CREATED)`
- **204 NO_CONTENT**: Successful DELETE with `@HttpCode(HttpStatus.NO_CONTENT)`
- **400 BAD_REQUEST**: Invalid input (automatic via ValidationPipe)
- **401 UNAUTHORIZED**: Not authenticated
- **403 FORBIDDEN**: Authenticated but not authorized
- **404 NOT_FOUND**: Resource doesn't exist
- **429 TOO_MANY_REQUESTS**: Rate limit exceeded

## Request/Response Patterns

### Request Bodies
- Always use DTOs with validation decorators
- Keep DTOs focused: separate CreateDto and UpdateDto
- Use `@Body()` decorator for POST/PATCH
- Automatic validation via global ValidationPipe

### Response Bodies
- Always return Entity classes for serialization
- Exclude sensitive fields via @Exclude() decorator
- Consistent structure across endpoints
- Return arrays for list endpoints, single objects for detail endpoints

### Query Parameters
- Use `@Query()` for filtering, pagination, sorting
- Validate with query DTOs when complex
- Document expected parameters

### Path Parameters
- Use `@Param()` for resource identifiers
- Always use `ParseIntPipe` for numeric IDs: `@Param('id', ParseIntPipe)`
- Validate existence in service layer

## Cookie-Based Authentication

### Cookie Names
- `accessToken`: JWT access token (15min, path: `/`)
- `Refresh`: Refresh token (7d, path: `/auth/refresh`)

### Cookie Attributes
- httpOnly: true (JavaScript cannot access)
- secure: true (HTTPS only, works in dev with SameSite=none)
- sameSite: 'lax' (production) or 'none' (development)
- path: specific to token type

### Authentication Flow
1. Client POSTs credentials to `/auth/login` or `/auth/register`
2. Server sets accessToken and Refresh cookies
3. Client includes cookies automatically on subsequent requests
4. Server validates accessToken via JwtAuthGuard
5. Client refreshes via `/auth/refresh` using Refresh cookie

## Error Responses

### Automatic Error Formatting
- NestJS exception filters handle formatting
- Validation errors include field-level details
- Stack traces only in development

### Custom Error Messages
```typescript
throw new NotFoundException(`Recipe with ID ${id} not found`);
throw new ForbiddenException('You do not have access to this recipe');
```

## Rate Limiting

- Global: 10 requests per 60 seconds
- Applied to all routes including public endpoints
- 429 status code when limit exceeded
- Configure via THROTTLE_TTL and THROTTLE_LIMIT environment variables

## Versioning

- Currently unversioned (v1 implied)
- When versioning needed, use URI versioning: `/v2/recipes`
- Never break existing endpoints - create new version instead

## CORS Configuration

- Configured in main.ts via `enableCors()`
- Allowed origins from ALLOWED_ORIGINS environment variable
- Credentials enabled for cookie-based auth
- Allowed methods: GET, POST, PUT, PATCH, DELETE, OPTIONS

## Documentation

- Document complex DTOs with JSDoc comments
- Explain non-obvious business logic
- Keep OpenAPI/Swagger in mind for future addition
- Document authentication requirements in endpoint docstrings
