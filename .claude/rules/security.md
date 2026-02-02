---
paths: src/**/*.ts
---

# Security Best Practices

## Authentication & Authorization

- **Global Protection**: All routes are protected by default - intentionally opt-out with `@Public()`
- **User Ownership**: Always validate userId matches authenticated user when accessing user-owned resources
- **Token Management**:
  - Access tokens: 15 minutes expiry
  - Refresh tokens: 7 days expiry, hashed before storage
  - Both stored in httpOnly cookies with secure flag

## Password Handling

- **Hashing**: Use bcrypt with 10 rounds (default in bcrypt.hash)
- **Never Log**: Never log passwords, tokens, or hashed values
- **Comparison**: Always use `bcrypt.compare()` for password verification
- **Optional Passwords**: passwordHash can be null for OAuth-only users

## Cookie Security

- **httpOnly**: Always true - prevents JavaScript access
- **secure**: Environment-dependent (false in development to allow HTTP localhost, true in production for HTTPS only)
- **SameSite**:
  - Production: 'lax' (same-site requests)
  - Development: 'none' (cross-site allowed for localhost frontend)
- **Path Restrictions**: Refresh token cookie restricted to `/auth/refresh` path

## Input Validation

- **Trust the Pipeline**: Global ValidationPipe handles all DTO validation
- **Sanitization**: `whitelist: true` strips unknown properties
- **Strict Mode**: `forbidNonWhitelisted: true` rejects requests with extra fields
- **SQL Injection**: Prisma provides automatic protection - never use raw queries without parameterization

## Sensitive Data

- **Never Commit**: .env files, secrets, API keys
- **Never Expose**: passwordHash, hashedRefreshToken, JWT secrets
- **Entity Pattern**: Use @Exclude() decorator to automatically filter sensitive fields
- **Logs**: Be cautious logging user data - strip sensitive fields first

## Rate Limiting

- **Global Throttler**: 10 requests per 60 seconds by default
- **Configure per Environment**: Adjust THROTTLE_TTL and THROTTLE_LIMIT as needed
- **Applies to All Routes**: Including public endpoints

## OAuth Security

- **Account Linking**: OAuth users automatically link to existing local accounts via email
- **Provider Validation**: Always validate OAuth provider response
- **State Parameter**: Passport strategies handle CSRF protection via state
- **Callback URL**: Must match exactly in OAuth provider console settings
