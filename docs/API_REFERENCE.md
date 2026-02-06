# API Reference

Base URL: `http://localhost:4000`

## Table of Contents

- [Authentication](#authentication)
- [Users](#users)
- [Recipes](#recipes)
- [Recipe Ingredients](#recipe-ingredients)
- [Recipe Steps](#recipe-steps)
- [Data Types](#data-types)

---

## Authentication

Cookie-based authentication using JWT tokens. Access tokens are valid for 15 minutes, refresh tokens for 7 days.

All endpoints are **protected by default** unless marked as **Public**.

### Authentication Cookies

- `accessToken` - JWT access token (httpOnly, secure, 15min, path: `/`)
- `refreshToken` - JWT refresh token (httpOnly, secure, 7d, path: `/auth/refresh`)

---

### `GET /auth/csrf`

**Public** - Get CSRF token for form submissions.

**Response:** `200 OK`
```json
{
  "csrfToken": "string"
}
```

---

### `GET /auth/google`

**Public** - Initiate Google OAuth flow. Redirects to Google login.

**Response:** Redirect to Google OAuth consent screen

---

### `GET /auth/google/callback`

**Public** - Google OAuth callback handler. Sets authentication cookies and redirects to frontend.

**Response:** Redirect to `${FRONTEND_URL}/auth/callback`

**Sets Cookies:** `accessToken`, `refreshToken`

---

### `GET /auth/profile`

**Protected** - Get current authenticated user profile.

**Response:** `200 OK`
```json
{
  "username": "string",
  "email": "string",
  "name": "string | null",
  "image": "string | null",
  "provider": "LOCAL | GOOGLE | APPLE | GITHUB",
  "providerId": "string | null",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

---

### `GET /auth/refresh`

**Public** (requires `refreshToken` cookie) - Refresh access token using refresh token.

**Response:** `200 OK`
```json
{
  "message": "Tokens refreshed"
}
```

**Sets Cookies:** `accessToken`, `refreshToken` (new tokens)

**Errors:**
- `401 Unauthorized` - Invalid or expired refresh token

---

### `POST /auth/login`

**Public** - Login with username and password.

**Request Body:**
```json
{
  "username": "string",      // min 3 chars
  "password": "string"       // SHA-256 hash (64 hex chars)
}
```

**Response:** `200 OK`
```json
{
  "user": {
    "username": "string",
    "email": "string",
    "name": "string | null",
    "image": "string | null",
    "provider": "LOCAL | GOOGLE | APPLE | GITHUB",
    "providerId": "string | null",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

**Sets Cookies:** `accessToken`, `refreshToken`

**Errors:**
- `401 Unauthorized` - Invalid credentials

---

### `POST /auth/logout`

**Public** - Logout and clear authentication cookies.

**Response:** `200 OK`
```json
{
  "message": "Logged out successfully"
}
```

**Clears Cookies:** `accessToken`, `refreshToken`

---

### `POST /auth/register`

**Public** - Register a new user account.

**Request Body:**
```json
{
  "username": "string",      // 3-30 chars, alphanumeric + _ -
  "email": "string",          // valid email
  "password": "string",       // SHA-256 hash (64 hex chars)
  "name": "string"            // 1-100 chars
}
```

**Response:** `201 Created`
```json
{
  "user": {
    "username": "string",
    "email": "string",
    "name": "string",
    "image": "string | null",
    "provider": "LOCAL",
    "providerId": "string | null",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

**Sets Cookies:** `accessToken`, `refreshToken`

**Errors:**
- `400 Bad Request` - Validation error or username/email already exists

---

## Users

User management endpoints.

### `DELETE /users/:username`

**Protected** - Delete user account. Users can only delete their own account.

**Path Parameters:**
- `username` (string) - Username of the user to delete

**Response:** `204 No Content`

**Errors:**
- `403 Forbidden` - Attempting to delete another user's account
- `404 Not Found` - User not found

---

### `GET /users`

**Protected** - Get all users in the system.

**Response:** `200 OK`
```json
[
  {
    "username": "string",
    "email": "string",
    "name": "string | null",
    "image": "string | null",
    "provider": "LOCAL | GOOGLE | APPLE | GITHUB",
    "providerId": "string | null",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
]
```

---

### `GET /users/me`

**Protected** - Get current authenticated user profile.

**Response:** `200 OK`
```json
{
  "username": "string",
  "email": "string",
  "name": "string | null",
  "image": "string | null",
  "provider": "LOCAL | GOOGLE | APPLE | GITHUB",
  "providerId": "string | null",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

---

### `GET /users/:username`

**Protected** - Get user by username.

**Path Parameters:**
- `username` (string) - Username of the user

**Response:** `200 OK`
```json
{
  "username": "string",
  "email": "string",
  "name": "string | null",
  "image": "string | null",
  "provider": "LOCAL | GOOGLE | APPLE | GITHUB",
  "providerId": "string | null",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**Errors:**
- `404 Not Found` - User not found

---

### `PATCH /users/:username`

**Protected** - Update user profile. Users can only update their own profile.

**Path Parameters:**
- `username` (string) - Username of the user to update

**Request Body:** (all fields optional)
```json
{
  "name": "string",          // max 100 chars
  "image": "string"          // URL to profile image
}
```

**Response:** `200 OK`
```json
{
  "username": "string",
  "email": "string",
  "name": "string | null",
  "image": "string | null",
  "provider": "LOCAL | GOOGLE | APPLE | GITHUB",
  "providerId": "string | null",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**Errors:**
- `403 Forbidden` - Attempting to update another user's profile
- `404 Not Found` - User not found

---

### `POST /users`

**Public** - Create a new user (alternative to /auth/register).

**Request Body:**
```json
{
  "username": "string",       // required, 3-30 chars, alphanumeric + _ -
  "email": "string",           // required, valid email
  "passwordHash": "string",    // optional, min 8 chars
  "name": "string",            // optional, max 100 chars
  "image": "string",           // optional, URL
  "provider": "LOCAL | GOOGLE | APPLE | GITHUB",  // optional, defaults to LOCAL
  "providerId": "string"       // optional
}
```

**Response:** `201 Created`
```json
{
  "username": "string",
  "email": "string",
  "name": "string | null",
  "image": "string | null",
  "provider": "LOCAL | GOOGLE | APPLE | GITHUB",
  "providerId": "string | null",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**Errors:**
- `400 Bad Request` - Validation error or username/email already exists

---

## Recipes

Recipe management endpoints. All recipe operations are user-scoped (users can only access their own recipes).

### `DELETE /recipes/:id`

**Protected** - Delete a recipe. Users can only delete their own recipes.

**Path Parameters:**
- `id` (integer) - Recipe ID

**Response:** `204 No Content`

**Errors:**
- `403 Forbidden` - Attempting to delete another user's recipe
- `404 Not Found` - Recipe not found

---

### `GET /recipes`

**Protected** - Get all recipes for the authenticated user.

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "userId": 1,
    "title": "string",
    "description": "string | null",
    "servings": 4,
    "prepTime": 15,              // minutes, nullable
    "cookTime": 30,              // minutes, nullable
    "imageUrl": "string | null",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
]
```

---

### `GET /recipes/:id`

**Protected** - Get a specific recipe. Users can only access their own recipes.

**Path Parameters:**
- `id` (integer) - Recipe ID

**Response:** `200 OK`
```json
{
  "id": 1,
  "userId": 1,
  "title": "string",
  "description": "string | null",
  "servings": 4,
  "prepTime": 15,
  "cookTime": 30,
  "imageUrl": "string | null",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**Errors:**
- `403 Forbidden` - Attempting to access another user's recipe
- `404 Not Found` - Recipe not found

---

### `PATCH /recipes/:id`

**Protected** - Update a recipe. Users can only update their own recipes.

**Path Parameters:**
- `id` (integer) - Recipe ID

**Request Body:** (all fields optional)
```json
{
  "title": "string",
  "description": "string",
  "servings": 4,               // min 1
  "prepTime": 15,              // minutes, min 0
  "cookTime": 30,              // minutes, min 0
  "imageUrl": "string"
}
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "userId": 1,
  "title": "string",
  "description": "string | null",
  "servings": 4,
  "prepTime": 15,
  "cookTime": 30,
  "imageUrl": "string | null",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**Errors:**
- `400 Bad Request` - Validation error
- `403 Forbidden` - Attempting to update another user's recipe
- `404 Not Found` - Recipe not found

---

### `POST /recipes`

**Protected** - Create a new recipe for the authenticated user.

**Request Body:**
```json
{
  "title": "string",                    // required
  "description": "string",              // optional
  "servings": 4,                        // optional, min 1, defaults to 1
  "prepTime": 15,                       // optional, minutes, min 0
  "cookTime": 30,                       // optional, minutes, min 0
  "imageUrl": "string",                 // optional
  "ingredients": [                      // optional, array of ingredients
    {
      "ingredientName": "string",       // required, max 100 chars
      "quantity": 1.5,                  // required, min 0.01
      "unit": "GRAM",                   // required, see Unit enum
      "notes": "string",                // optional, max 500 chars
      "order": 0                        // optional, min 0, defaults to 0
    }
  ],
  "steps": [                            // optional, array of steps
    {
      "instruction": "string",          // required, max 1000 chars
      "duration": 5                     // optional, minutes, min 0
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "userId": 1,
  "title": "string",
  "description": "string | null",
  "servings": 4,
  "prepTime": 15,
  "cookTime": 30,
  "imageUrl": "string | null",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**Errors:**
- `400 Bad Request` - Validation error

---

## Recipe Ingredients

Nested ingredient management for recipes. Users can only modify ingredients in their own recipes.

### `DELETE /recipes/:recipeId/ingredients/:ingredientId`

**Protected** - Delete an ingredient from a recipe.

**Path Parameters:**
- `recipeId` (integer) - Recipe ID
- `ingredientId` (integer) - Ingredient ID

**Response:** `204 No Content`

**Errors:**
- `403 Forbidden` - Attempting to modify another user's recipe
- `404 Not Found` - Recipe or ingredient not found

---

### `PATCH /recipes/:recipeId/ingredients/:ingredientId`

**Protected** - Update an ingredient in a recipe.

**Path Parameters:**
- `recipeId` (integer) - Recipe ID
- `ingredientId` (integer) - Ingredient ID

**Request Body:** (all fields optional)
```json
{
  "ingredientName": "string",    // max 100 chars
  "quantity": 1.5,               // min 0.01
  "unit": "GRAM",                // see Unit enum
  "notes": "string",             // max 500 chars
  "order": 0                     // min 0
}
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "recipeId": 1,
  "ingredientName": "string",
  "quantity": 1.5,
  "unit": "GRAM",
  "notes": "string | null",
  "order": 0
}
```

**Errors:**
- `400 Bad Request` - Validation error
- `403 Forbidden` - Attempting to modify another user's recipe
- `404 Not Found` - Recipe or ingredient not found

---

### `POST /recipes/:recipeId/ingredients`

**Protected** - Add an ingredient to a recipe.

**Path Parameters:**
- `recipeId` (integer) - Recipe ID

**Request Body:**
```json
{
  "ingredientName": "string",    // required, max 100 chars
  "quantity": 1.5,               // required, min 0.01
  "unit": "GRAM",                // required, see Unit enum
  "notes": "string",             // optional, max 500 chars
  "order": 0                     // optional, min 0, defaults to 0
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "recipeId": 1,
  "ingredientName": "string",
  "quantity": 1.5,
  "unit": "GRAM",
  "notes": "string | null",
  "order": 0
}
```

**Errors:**
- `400 Bad Request` - Validation error
- `403 Forbidden` - Attempting to modify another user's recipe
- `404 Not Found` - Recipe not found

---

## Recipe Steps

Nested step management for recipes. Users can only modify steps in their own recipes.

### `DELETE /recipes/:recipeId/steps/:stepId`

**Protected** - Delete a step from a recipe.

**Path Parameters:**
- `recipeId` (integer) - Recipe ID
- `stepId` (integer) - Step ID

**Response:** `204 No Content`

**Errors:**
- `403 Forbidden` - Attempting to modify another user's recipe
- `404 Not Found` - Recipe or step not found

---

### `PATCH /recipes/:recipeId/steps/:stepId`

**Protected** - Update a step in a recipe.

**Path Parameters:**
- `recipeId` (integer) - Recipe ID
- `stepId` (integer) - Step ID

**Request Body:** (all fields optional)
```json
{
  "instruction": "string",       // max 1000 chars
  "duration": 5                  // minutes, min 0
}
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "recipeId": 1,
  "stepNumber": 1,
  "instruction": "string",
  "duration": 5
}
```

**Errors:**
- `400 Bad Request` - Validation error
- `403 Forbidden` - Attempting to modify another user's recipe
- `404 Not Found` - Recipe or step not found

---

### `POST /recipes/:recipeId/steps`

**Protected** - Add a step to a recipe.

**Path Parameters:**
- `recipeId` (integer) - Recipe ID

**Request Body:**
```json
{
  "instruction": "string",       // required, max 1000 chars
  "duration": 5                  // optional, minutes, min 0
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "recipeId": 1,
  "stepNumber": 1,               // auto-generated, sequential
  "instruction": "string",
  "duration": 5
}
```

**Errors:**
- `400 Bad Request` - Validation error
- `403 Forbidden` - Attempting to modify another user's recipe
- `404 Not Found` - Recipe not found

---

## Data Types

### AuthProvider Enum

Authentication provider types:

```
LOCAL     // Email/password authentication
GOOGLE    // Google OAuth
APPLE     // Apple OAuth (not yet implemented)
GITHUB    // GitHub OAuth (not yet implemented)
```

### Unit Enum

Available measurement units for recipe ingredients:

```
GRAM          // Weight metric
KILOGRAM      // Weight metric
MILLILITER    // Volume metric
LITER         // Volume metric
TEASPOON      // Volume imperial
TABLESPOON    // Volume imperial
CUP           // Volume imperial
UNIT          // For counting items (e.g., 2 eggs, 3 tomatoes)
PINCH         // Small amount
TO_TASTE      // Variable amount based on preference
```

---

## Error Responses

All error responses follow NestJS standard format:

```json
{
  "statusCode": 400,
  "message": "Validation failed: username must be at least 3 characters",
  "error": "Bad Request"
}
```

For validation errors with multiple fields:

```json
{
  "statusCode": 400,
  "message": [
    "username must be at least 3 characters",
    "email must be a valid email"
  ],
  "error": "Bad Request"
}
```

### Common Status Codes

- `200 OK` - Successful GET/PATCH/POST request
- `201 Created` - Resource successfully created
- `204 No Content` - Resource successfully deleted
- `400 Bad Request` - Invalid input or validation error
- `401 Unauthorized` - Not authenticated (missing or invalid token)
- `403 Forbidden` - Authenticated but not authorized to access resource
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded (10 requests per 60 seconds)
- `500 Internal Server Error` - Server error

---

## Authentication & Authorization

### Cookie-Based Authentication

The API uses JWT tokens stored in httpOnly cookies:

- **Access Token** - Short-lived (15 minutes), sent with every request
- **Refresh Token** - Long-lived (7 days), used only at `/auth/refresh`

### Protected vs Public Endpoints

By default, **all endpoints are protected** and require authentication. Public endpoints are explicitly marked.

### User Ownership

For user-owned resources (recipes, ingredients, steps):
- Users can only access their own resources
- Attempting to access another user's resource returns `403 Forbidden`
- Resource IDs are validated against the authenticated user's ID

---

## Rate Limiting

All endpoints are rate-limited to **10 requests per 60 seconds** per IP address (configurable via `THROTTLE_TTL` and `THROTTLE_LIMIT`).

When limit is exceeded, the API returns:
```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

---

## CORS Configuration

The API supports CORS for origins configured in `ALLOWED_ORIGINS` environment variable.

Default allowed origins:
- `http://localhost:3000`
- `http://localhost:5173`
- `http://localhost:4200`

**Credentials:** Enabled (required for cookie-based authentication)

---

## Notes

### General

- All timestamps are in ISO 8601 format (e.g., `2024-01-15T10:30:00.000Z`)
- All request/response bodies use JSON format
- Numeric IDs are integers (auto-incrementing)
- Nullable fields are explicitly marked with `| null`

### Security

- Passwords must be sent as **SHA-256 hashes** (64 hexadecimal characters)
- Client should hash passwords before sending to API
- Sensitive fields (`passwordHash`, `hashedRefreshToken`) are never returned in responses
- Cookies are httpOnly, secure (HTTPS), and have appropriate SameSite settings

### Recipe Creation

- Recipes can be created with nested ingredients and steps in a single POST request to `/recipes`
- Alternatively, ingredients and steps can be added individually after recipe creation using nested routes
- Step numbers are auto-generated and sequential
- Ingredient order defaults to 0 if not specified

### Password Hashing Example

Client-side password hashing (before sending to API):

```javascript
// JavaScript example using Web Crypto API
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
```
