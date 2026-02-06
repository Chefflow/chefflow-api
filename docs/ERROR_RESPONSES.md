# Authentication Error Responses

This document describes the standardized error response format for authentication endpoints.

## Error Response Contract

All authentication errors follow this format:

```typescript
interface BackendErrorResponse {
  code: "USERNAME_TAKEN" | "EMAIL_EXISTS" | "INVALID_CREDENTIALS" | "RATE_LIMIT" | "SERVER_ERROR" | "VALIDATION_ERROR";
  message: string;
  field?: string;
  suggestions?: string[];
  retryAfter?: number;
}
```

---

## Error Examples

### 1. USERNAME_TAKEN (409 Conflict)

Returned when attempting to register with an already taken username.

**Request:**
```http
POST /auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "new@example.com",
  "password": "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3",
  "name": "John Doe"
}
```

**Response: 409 Conflict**
```json
{
  "code": "USERNAME_TAKEN",
  "message": "Username is already taken",
  "field": "username",
  "suggestions": [
    "johndoe_123",
    "johndoe2026",
    "johndoe_user"
  ]
}
```

---

### 2. EMAIL_EXISTS (409 Conflict)

Returned when attempting to register with an already registered email.

**Request:**
```http
POST /auth/register
Content-Type: application/json

{
  "username": "newuser",
  "email": "existing@example.com",
  "password": "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3",
  "name": "New User"
}
```

**Response: 409 Conflict**
```json
{
  "code": "EMAIL_EXISTS",
  "message": "Email is already registered",
  "field": "email",
  "suggestions": [
    "Try logging in instead",
    "Use a different email address"
  ]
}
```

---

### 3. INVALID_CREDENTIALS (401 Unauthorized)

Returned when login credentials are incorrect (wrong username or password).

**Request:**
```http
POST /auth/login
Content-Type: application/json

{
  "username": "johndoe",
  "password": "b665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3"
}
```

**Response: 401 Unauthorized**
```json
{
  "code": "INVALID_CREDENTIALS",
  "message": "Invalid username or password",
  "suggestions": [
    "Check your username and password",
    "Reset your password if forgotten"
  ]
}
```

**Security Note:** The same error message is returned for both wrong username and wrong password to prevent username enumeration attacks.

---

### 4. VALIDATION_ERROR (400 Bad Request)

Returned when input validation fails (from class-validator).

**Request:**
```http
POST /auth/register
Content-Type: application/json

{
  "username": "ab",
  "email": "invalid-email",
  "password": "short",
  "name": "Test"
}
```

**Response: 400 Bad Request**
```json
{
  "code": "VALIDATION_ERROR",
  "message": "username must be at least 3 characters"
}
```

**Common validation errors:**
- Username too short (min 3 chars) or too long (max 30 chars)
- Username contains invalid characters (only alphanumeric, hyphens, underscores allowed)
- Invalid email format
- Password is not a SHA-256 hash (64 hexadecimal characters)
- Name too long (max 100 chars)

---

### 5. RATE_LIMIT (429 Too Many Requests)

Returned when rate limit is exceeded (default: 10 requests per 60 seconds).

**Request:**
```http
POST /auth/login
Content-Type: application/json

{
  "username": "johndoe",
  "password": "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3"
}
```

**Response: 429 Too Many Requests**
```json
{
  "code": "RATE_LIMIT",
  "message": "Too many requests. Please try again later",
  "retryAfter": 60,
  "suggestions": [
    "Wait 60 seconds before trying again"
  ]
}
```

**Configuration:**
- Default: 10 requests per 60 seconds per IP address
- Configurable via `THROTTLE_TTL` and `THROTTLE_LIMIT` environment variables

---

### 6. SERVER_ERROR (500 Internal Server Error)

Returned when an unexpected server error occurs.

**Request:**
```http
POST /auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3",
  "name": "John Doe"
}
```

**Response: 500 Internal Server Error**
```json
{
  "code": "SERVER_ERROR",
  "message": "Failed to register user"
}
```

---

## Implementation Details

### Backend Files

1. **Exception Classes** (`src/common/exceptions/auth.exception.ts`)
   - `UsernameTakenException`
   - `EmailExistsException`
   - `InvalidCredentialsException`
   - `RateLimitException`
   - `AuthServerErrorException`
   - `ValidationErrorException`

2. **Exception Filter** (`src/common/filters/auth-exception.filter.ts`)
   - Global filter registered in `AppModule`
   - Catches `AuthException`, `ThrottlerException`, and `HttpException`
   - Formats errors to match contract

3. **Applied in:**
   - `AuthService` - Uses custom exceptions
   - `AuthController` - Applies filter with `@UseFilters(AuthExceptionFilter)`
   - `AppModule` - Registered globally with `APP_FILTER`

---

## Frontend Integration

### TypeScript Interface

```typescript
interface BackendErrorResponse {
  code: "USERNAME_TAKEN" | "EMAIL_EXISTS" | "INVALID_CREDENTIALS" | "RATE_LIMIT" | "SERVER_ERROR" | "VALIDATION_ERROR";
  message: string;
  field?: string;
  suggestions?: string[];
  retryAfter?: number;
}
```

### Example Error Handling

```typescript
async function register(data: RegisterData) {
  try {
    const response = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error: BackendErrorResponse = await response.json();

      switch (error.code) {
        case 'USERNAME_TAKEN':
          // Show error with suggestions
          showError(error.message, error.field);
          showSuggestions(error.suggestions);
          break;

        case 'EMAIL_EXISTS':
          // Prompt user to log in instead
          showError(error.message, error.field);
          showLoginPrompt();
          break;

        case 'VALIDATION_ERROR':
          // Show field validation error
          showError(error.message, error.field);
          break;

        case 'RATE_LIMIT':
          // Show countdown timer
          showRateLimitError(error.message, error.retryAfter!);
          break;

        case 'SERVER_ERROR':
          // Show generic error
          showError(error.message);
          break;

        default:
          showError('An unexpected error occurred');
      }
    }

    return await response.json();
  } catch (err) {
    showError('Network error. Please check your connection.');
  }
}
```

---

## Testing

E2E tests are available in `test/auth-errors.e2e-spec.ts`.

Run tests:
```bash
pnpm run test:e2e -- auth-errors.e2e-spec.ts
```

Tests verify:
- ✅ USERNAME_TAKEN error with suggestions
- ✅ EMAIL_EXISTS error with suggestions
- ✅ INVALID_CREDENTIALS error
- ✅ VALIDATION_ERROR for invalid input
- ✅ RATE_LIMIT error with retryAfter
- ✅ Correct HTTP status codes
- ✅ Error response format matches contract

---

## Security Considerations

1. **Username Enumeration Prevention**
   - Login returns same error for wrong username or password
   - Prevents attackers from discovering valid usernames

2. **Rate Limiting**
   - Applied globally to all endpoints
   - Prevents brute force attacks
   - Returns clear retry information to legitimate users

3. **Password Hashing**
   - Passwords hashed with bcrypt (10 rounds)
   - Client should send SHA-256 hash to API
   - API hashes again with bcrypt before storing

4. **Error Messages**
   - Generic messages prevent information leakage
   - Suggestions help legitimate users without exposing system details
