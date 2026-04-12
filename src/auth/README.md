# Auth Module

> **Prefix**: `/auth`
> **Auth**: Most endpoints are public (login/register/OAuth). See each endpoint.

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/auth/csrf` | No | Get CSRF token |
| POST | `/auth/register` | No | Register new user |
| POST | `/auth/login` | No | Login with credentials |
| GET | `/auth/profile` | JWT | Get authenticated user profile |
| GET | `/auth/refresh` | Refresh token | Refresh access token |
| POST | `/auth/logout` | No | Clear session cookies |
| GET | `/auth/google` | No | Initiate Google OAuth (WIP) |
| GET | `/auth/google/callback` | No | Google OAuth callback (WIP) |

---

### GET /auth/csrf

Obtains a CSRF token for form submissions.

**Response** (200 OK):
```json
{
  "csrfToken": "abc123def456..."
}
```

---

### POST /auth/register

Creates a new user and starts a session automatically.

**Status Code**: 201 CREATED

**Request Body**:
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "a1b2c3d4e5f6...",
  "name": "John Doe"
}
```

**Validations**:
- `username`: 3–30 characters, alphanumeric, hyphens, and underscores only
- `email`: Valid email address
- `password`: Must be a SHA-256 hash (64 hex characters)
- `name`: 1–100 characters

**Response** (201 Created):
```json
{
  "user": {
    "username": "john_doe",
    "email": "john@example.com",
    "name": "John Doe",
    "image": null,
    "provider": "LOCAL",
    "providerId": null,
    "createdAt": "2026-03-22T10:30:00Z",
    "updatedAt": "2026-03-22T10:30:00Z"
  }
}
```

**Cookies set**: `accessToken` (15 min), `refreshToken` (7 days, path=/auth/refresh)

---

### POST /auth/login

Authenticates an existing user.

**Request Body**:
```json
{
  "username": "john_doe",
  "password": "a1b2c3d4e5f6..."
}
```

**Response** (200 OK):
```json
{
  "user": {
    "username": "john_doe",
    "email": "john@example.com",
    "name": "John Doe",
    "image": null,
    "provider": "LOCAL",
    "providerId": null,
    "createdAt": "2026-03-22T10:30:00Z",
    "updatedAt": "2026-03-22T10:30:00Z"
  }
}
```

**Cookies set**: `accessToken` (15 min), `refreshToken` (7 days, path=/auth/refresh)

---

### GET /auth/profile

Returns the profile of the authenticated user.

**Auth**: JWT required

**Response** (200 OK):
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "name": "John Doe",
  "image": null,
  "provider": "LOCAL",
  "providerId": null,
  "createdAt": "2026-03-22T10:30:00Z",
  "updatedAt": "2026-03-22T10:30:00Z"
}
```

---

### GET /auth/refresh

Issues new tokens using the refresh token cookie.

**Auth**: Refresh token cookie required (path=/auth/refresh)

**Response** (200 OK):
```json
{
  "message": "Tokens refreshed"
}
```

**Cookies updated**: new `accessToken` (15 min), new `refreshToken` (7 days)

---

### POST /auth/logout

Clears session cookies.

**Response** (200 OK):
```json
{
  "message": "Logged out successfully"
}
```

---

### GET /auth/google ⚠️ WIP

Initiates the Google OAuth flow. Redirects to Google.

---

### GET /auth/google/callback ⚠️ WIP

Google OAuth callback. Behavior:
1. Passport validates the code with Google
2. If user does not exist, creates one
3. If a user with the same email exists, links automatically
4. Sets JWT cookies
5. Redirects to `{FRONTEND_URL}/auth/callback`

> Account linking and full flow still under development.
