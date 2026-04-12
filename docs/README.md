# ChefFlow API - Documentation

> **Date**: 2026-03-22
> **API Version**: v1
> **Base URL**: `http://localhost:4000` (development) | `https://api.chefflow.com` (production)

---

## Table of Contents

1. [Global Conventions](#global-conventions)
2. [Authentication System](#authentication-system)
3. [Modules](#modules)
4. [Error Codes](#error-codes)

---

## Global Conventions

### Authentication
- **Default**: All endpoints are **protected** by JWT (except those marked with `@Public()`)
- **Method**: Cookie-based with JWT tokens
- **Header**: Sent automatically on each request (httpOnly cookie)

### Status Codes
| Code | Name | Description |
|------|------|-------------|
| **200** | OK | Successful GET / PATCH |
| **201** | CREATED | Successful POST (create) |
| **204** | NO_CONTENT | Successful DELETE |
| **400** | BAD_REQUEST | Validation failed / invalid input |
| **401** | UNAUTHORIZED | Not authenticated or token expired |
| **403** | FORBIDDEN | Authenticated but lacks permission |
| **404** | NOT_FOUND | Resource does not exist |
| **429** | TOO_MANY_REQUESTS | Rate limit exceeded |

### Global Validation
All requests pass through a `ValidationPipe` that:
- Validates types and formats according to DTOs
- Rejects properties not defined in the DTO
- Automatically transforms payloads to DTO instances
- Returns detailed per-field errors

**Validation error example**:
```json
{
  "message": [
    "username must be a string",
    "email must be an email"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

### Rate Limiting
All endpoints (including public ones) are limited to:
- **10 requests** per **60 seconds** per IP
- 429 response when exceeded
- Configurable via `THROTTLE_TTL` and `THROTTLE_LIMIT`

---

## Authentication System

### Cookie System

Cookies are set automatically on login/register endpoints. **You do not need to handle them manually**.

#### Cookie: `accessToken`
```
Name:     accessToken
Value:    <JWT token, 15 minutes>
Path:     /
HttpOnly: true
Secure:   true  (production or FORCE_CROSS_ORIGIN_COOKIES=true)
          false (development default)
SameSite: lax   (production or development default)
          none  (only when FORCE_CROSS_ORIGIN_COOKIES=true — requires secure=true)
MaxAge:   15 minutes
```

#### Cookie: `refreshToken`
```
Name:     refreshToken
Value:    <JWT token, 7 days>
Path:     /auth/refresh    ← ⚠️ Restricted to this path (security)
HttpOnly: true
Secure:   true  (production or FORCE_CROSS_ORIGIN_COOKIES=true)
          false (development default)
SameSite: lax   (production or development default)
          none  (only when FORCE_CROSS_ORIGIN_COOKIES=true — requires secure=true)
MaxAge:   7 days
```

### Authentication Flow (Local)
1. Client: `POST /auth/register` or `POST /auth/login` with credentials
2. Server: Validates and returns user + **sets cookies automatically**
3. Client: Cookies are included automatically on subsequent requests
4. Server: Validates `accessToken` on each request
5. Client: When `accessToken` expires → `GET /auth/refresh` (uses `refreshToken` from path `/auth/refresh`)
6. Server: Issues new tokens and updates cookies

### Security Notes
- **Do not store tokens in localStorage**: httpOnly cookies are far more secure
- **HTTPS required in production**: Cookies with `secure=true` are only sent over HTTPS
- **CORS with credentials**: Frontend must use `credentials: 'include'` in fetch/axios
- **SameSite Protection**: Guards against CSRF
- **Refresh Token Path Restriction**: Only accessible at `/auth/refresh` (defense in depth)

---

## Modules

| Module | Prefix | Description |
|--------|--------|-------------|
| [Auth](../src/auth/README.md) | `/auth` | Registration, login, OAuth, token refresh |
| [Users](../src/users/README.md) | `/users` | User profile management |
| [Recipes](../src/recipes/README.md) | `/recipes` | Recipe CRUD operations |
| [Recipe Ingredients](../src/recipe-ingredients/README.md) | `/recipes/:recipeId/ingredients` | Nested ingredient management |
| [Recipe Steps](../src/recipe-steps/README.md) | `/recipes/:recipeId/steps` | Nested step management |
| [Weekly Plannings](../src/weekly-plannings/README.md) | `/weekly-plannings` | Weekly meal planning and slots |

---

## Error Codes

### Error Response Format

**Validation failed** (400):
```json
{
  "message": [
    "username must be a string",
    "email must be an email"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

**Authentication failed** (401):
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

**Forbidden** (403):
```json
{
  "message": "You can only update your own profile",
  "error": "Forbidden",
  "statusCode": 403
}
```

**Not Found** (404):
```json
{
  "message": "Recipe with ID 5 not found",
  "error": "Not Found",
  "statusCode": 404
}
```

---

*Last updated: 2026-04-09*
