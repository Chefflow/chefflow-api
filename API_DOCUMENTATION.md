# Chefflow API Reference

**Base URL**: `http://localhost:4000` (development) | `https://api.yourdomain.com` (production)

**Authentication**: HTTP-only cookie-based JWT (automatic)

**Rate Limit**: 10 requests / 60 seconds

---

## Table of Contents

- [Authentication](#authentication)
- [Users](#users)
- [Recipes](#recipes)
- [Recipe Ingredients](#recipe-ingredients)
- [Recipe Steps](#recipe-steps)

---

## Authentication

Cookie-based authentication with JWT. Cookies are set/cleared automatically.

| Cookie | Lifetime | Path |
|--------|----------|------|
| `accessToken` | 15 minutes | `/` |
| `Refresh` | 7 days | `/auth/refresh` |

**Important**: Include `credentials: 'include'` in all requests.

---

### POST /auth/register

Create new user account.

**Auth**: Public

**Body**:
```json
{
  "username": "string",        // 3-30 chars, alphanumeric + - _
  "email": "string",           // Valid email
  "password": "string",        // SHA-256 hash (64 hex chars)
  "name": "string"            // 1-100 chars
}
```

**Response**: `201 Created`
```json
{
  "user": {
    "username": "johndoe",
    "email": "john@example.com",
    "name": "John Doe",
    "provider": "LOCAL",
    "providerId": null,
    "image": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### POST /auth/login

Authenticate user.

**Auth**: Public

**Body**:
```json
{
  "username": "string",
  "password": "string"  // SHA-256 hash
}
```

**Response**: `200 OK`
```json
{
  "user": { /* User object */ }
}
```

**Errors**: `401` Invalid credentials | `400` Invalid input

---

### GET /auth/profile

Get authenticated user profile.

**Auth**: Required

**Response**: `200 OK`
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "name": "John Doe",
  "provider": "LOCAL",
  "providerId": null,
  "image": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### GET /auth/refresh

Refresh access token using refresh token.

**Auth**: Requires `Refresh` cookie

**Response**: `200 OK`
```json
{
  "message": "Tokens refreshed"
}
```

---

### POST /auth/logout

Clear authentication cookies.

**Auth**: Public

**Response**: `200 OK`
```json
{
  "message": "Logged out successfully"
}
```

---

### GET /auth/google

Initiate Google OAuth2 flow.

**Auth**: Public

**Usage**: Redirect user to this endpoint.

---

### GET /auth/google/callback

OAuth2 callback handler.

**Auth**: Public

**Behavior**: Redirects to `${FRONTEND_URL}/auth/callback` with cookies set.

---

## Users

### POST /users

Create user (flexible version of register).

**Auth**: Public

**Body**:
```json
{
  "username": "string",         // Required
  "email": "string",           // Required
  "passwordHash": "string",    // Optional
  "name": "string",            // Optional
  "image": "string",           // Optional (URL)
  "provider": "LOCAL | GOOGLE | APPLE | GITHUB",  // Optional
  "providerId": "string"       // Optional
}
```

**Response**: `201 Created`

---

### GET /users/me

Get current user profile.

**Auth**: Required

**Response**: `200 OK` - User object

---

### GET /users

List all users.

**Auth**: Required

**Response**: `200 OK` - Array of user objects

---

### GET /users/:username

Get user by username.

**Auth**: Required

**Params**: `username` (string)

**Response**: `200 OK` - User object

**Errors**: `404` Not found

---

### PATCH /users/:username

Update user profile (own profile only).

**Auth**: Required

**Params**: `username` (string)

**Body**:
```json
{
  "name": "string",    // Optional
  "image": "string"    // Optional (URL)
}
```

**Response**: `200 OK` - Updated user object

**Errors**: `403` Forbidden | `404` Not found

---

### DELETE /users/:username

Delete user account (own account only).

**Auth**: Required

**Params**: `username` (string)

**Response**: `204 No Content`

**Errors**: `403` Forbidden | `404` Not found

**Note**: Cascade deletes all user recipes.

---

## Recipes

### POST /recipes

Create recipe with optional ingredients and steps (atomic transaction).

**Auth**: Required

**Body**:
```json
{
  "title": "string",                    // Required
  "description": "string",              // Optional
  "servings": 1,                        // Optional (default: 1, min: 1)
  "prepTime": 0,                        // Optional (minutes, min: 0)
  "cookTime": 0,                        // Optional (minutes, min: 0)
  "imageUrl": "string",                 // Optional
  "ingredients": [                      // Optional
    {
      "ingredientName": "string",       // Required (max: 100)
      "quantity": 0.01,                 // Required (min: 0.01)
      "unit": "GRAM",                   // Required (see units below)
      "notes": "string",                // Optional (max: 500)
      "order": 0                        // Optional (auto-assigned)
    }
  ],
  "steps": [                            // Optional
    {
      "instruction": "string",          // Required (max: 1000)
      "duration": 0                     // Optional (minutes, min: 0)
    }
  ]
}
```

**Units**: `GRAM`, `KILOGRAM`, `MILLILITER`, `LITER`, `TEASPOON`, `TABLESPOON`, `CUP`, `UNIT`, `PINCH`, `TO_TASTE`

**Response**: `200 OK`
```json
{
  "id": 1,
  "userId": 123,
  "title": "Pasta Carbonara",
  "description": "Delicious Italian pasta",
  "servings": 4,
  "prepTime": 10,
  "cookTime": 20,
  "imageUrl": "https://example.com/pasta.jpg",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "ingredients": [
    {
      "id": 1,
      "recipeId": 1,
      "ingredientName": "Pasta",
      "quantity": 400,
      "unit": "GRAM",
      "notes": "Preferably spaghetti",
      "order": 0
    }
  ],
  "steps": [
    {
      "id": 1,
      "recipeId": 1,
      "stepNumber": 1,
      "instruction": "Boil water",
      "duration": 5
    }
  ]
}
```

**Note**: Transaction is atomic. If any part fails, nothing is created.

---

### GET /recipes

List all user recipes.

**Auth**: Required

**Response**: `200 OK` - Array of recipe objects (without nested ingredients/steps)

---

### GET /recipes/:id

Get recipe by ID with ingredients and steps.

**Auth**: Required (own recipes only)

**Params**: `id` (integer)

**Response**: `200 OK` - Recipe object with `ingredients[]` and `steps[]`

**Errors**: `403` Forbidden | `404` Not found

---

### PATCH /recipes/:id

Update recipe base fields.

**Auth**: Required (own recipes only)

**Params**: `id` (integer)

**Body**:
```json
{
  "title": "string",         // Optional
  "description": "string",   // Optional
  "servings": 1,             // Optional (min: 1)
  "prepTime": 0,             // Optional (min: 0)
  "cookTime": 0,             // Optional (min: 0)
  "imageUrl": "string"       // Optional
}
```

**Response**: `200 OK` - Updated recipe object

**Errors**: `403` Forbidden | `404` Not found

---

### DELETE /recipes/:id

Delete recipe.

**Auth**: Required (own recipes only)

**Params**: `id` (integer)

**Response**: `204 No Content`

**Errors**: `403` Forbidden | `404` Not found

**Note**: Cascade deletes all ingredients and steps.

---

## Recipe Ingredients

Nested routes: `/recipes/:recipeId/ingredients`

### POST /recipes/:recipeId/ingredients

Add ingredient to recipe.

**Auth**: Required (own recipes only)

**Params**: `recipeId` (integer)

**Body**:
```json
{
  "ingredientName": "string",  // Required (max: 100)
  "quantity": 0.01,            // Required (min: 0.01)
  "unit": "GRAM",              // Required
  "notes": "string",           // Optional (max: 500)
  "order": 0                   // Optional (min: 0)
}
```

**Response**: `200 OK` - Ingredient object

**Errors**: `403` Forbidden | `404` Recipe not found

---

### PATCH /recipes/:recipeId/ingredients/:ingredientId

Update ingredient.

**Auth**: Required (own recipes only)

**Params**: `recipeId` (integer), `ingredientId` (integer)

**Body**: All fields optional (same as POST)

**Response**: `200 OK` - Updated ingredient object

**Errors**: `403` Forbidden | `404` Not found

---

### DELETE /recipes/:recipeId/ingredients/:ingredientId

Delete ingredient.

**Auth**: Required (own recipes only)

**Params**: `recipeId` (integer), `ingredientId` (integer)

**Response**: `204 No Content`

**Errors**: `403` Forbidden | `404` Not found

---

## Recipe Steps

Nested routes: `/recipes/:recipeId/steps`

### POST /recipes/:recipeId/steps

Add step to recipe.

**Auth**: Required (own recipes only)

**Params**: `recipeId` (integer)

**Body**:
```json
{
  "instruction": "string",  // Required (max: 1000)
  "duration": 0             // Optional (minutes, min: 0)
}
```

**Response**: `200 OK`
```json
{
  "id": 1,
  "recipeId": 1,
  "stepNumber": 1,  // Auto-assigned sequentially
  "instruction": "Boil water",
  "duration": 5
}
```

**Errors**: `403` Forbidden | `404` Recipe not found

---

### PATCH /recipes/:recipeId/steps/:stepId

Update step.

**Auth**: Required (own recipes only)

**Params**: `recipeId` (integer), `stepId` (integer)

**Body**: All fields optional (same as POST)

**Response**: `200 OK` - Updated step object

**Errors**: `403` Forbidden | `404` Not found

---

### DELETE /recipes/:recipeId/steps/:stepId

Delete step.

**Auth**: Required (own recipes only)

**Params**: `recipeId` (integer), `stepId` (integer)

**Response**: `204 No Content`

**Errors**: `403` Forbidden | `404` Not found

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (not authenticated) |
| 403 | Forbidden (no access) |
| 404 | Not Found |
| 429 | Too Many Requests (rate limit) |
| 500 | Internal Server Error |

---

## Error Response Format

```json
{
  "statusCode": 400,
  "message": "Validation failed" | ["error1", "error2"],
  "error": "Bad Request"
}
```

---

## CORS Configuration

**Allowed Origins**: `http://localhost:3000`, `http://localhost:5173`, `http://localhost:4200`

**Allowed Methods**: GET, POST, PUT, PATCH, DELETE, OPTIONS

**Credentials**: Enabled

---

## Client Implementation

### Password Hashing (Required)

```javascript
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

### API Client Class

```javascript
class ChefflowAPI {
  constructor(baseURL = 'http://localhost:4000') {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 204) return null;

    const data = await response.json();
    if (!response.ok) throw new Error(data.message);

    return data;
  }

  // Auth
  async register(username, email, password, name) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password: await hashPassword(password), name }),
    });
  }

  async login(username, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password: await hashPassword(password) }),
    });
  }

  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  async refreshTokens() {
    return this.request('/auth/refresh');
  }

  // Recipes
  async getRecipes() {
    return this.request('/recipes');
  }

  async getRecipe(id) {
    return this.request(`/recipes/${id}`);
  }

  async createRecipe(recipeData) {
    return this.request('/recipes', {
      method: 'POST',
      body: JSON.stringify(recipeData),
    });
  }

  async updateRecipe(id, recipeData) {
    return this.request(`/recipes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(recipeData),
    });
  }

  async deleteRecipe(id) {
    return this.request(`/recipes/${id}`, { method: 'DELETE' });
  }

  // Ingredients
  async addIngredient(recipeId, data) {
    return this.request(`/recipes/${recipeId}/ingredients`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateIngredient(recipeId, ingredientId, data) {
    return this.request(`/recipes/${recipeId}/ingredients/${ingredientId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteIngredient(recipeId, ingredientId) {
    return this.request(`/recipes/${recipeId}/ingredients/${ingredientId}`, {
      method: 'DELETE',
    });
  }

  // Steps
  async addStep(recipeId, data) {
    return this.request(`/recipes/${recipeId}/steps`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateStep(recipeId, stepId, data) {
    return this.request(`/recipes/${recipeId}/steps/${stepId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteStep(recipeId, stepId) {
    return this.request(`/recipes/${recipeId}/steps/${stepId}`, {
      method: 'DELETE',
    });
  }
}
```

### Usage Examples

```javascript
const api = new ChefflowAPI();

// Login
await api.login('johndoe', 'password123');

// Create complete recipe (atomic transaction)
const recipe = await api.createRecipe({
  title: "Pasta Carbonara",
  servings: 4,
  ingredients: [
    { ingredientName: "Pasta", quantity: 400, unit: "GRAM" },
    { ingredientName: "Eggs", quantity: 4, unit: "UNIT" }
  ],
  steps: [
    { instruction: "Boil water", duration: 5 },
    { instruction: "Cook pasta", duration: 10 }
  ]
});

// Update recipe title
await api.updateRecipe(recipe.id, { title: "Updated Title" });

// Add ingredient
await api.addIngredient(recipe.id, {
  ingredientName: "Salt",
  quantity: 1,
  unit: "PINCH"
});

// Get recipe with all details
const fullRecipe = await api.getRecipe(recipe.id);
console.log(fullRecipe.ingredients); // Array of ingredients
console.log(fullRecipe.steps);       // Array of steps
```

---

## Key Features

### Atomic Transactions

Creating a recipe with ingredients/steps uses a database transaction. All or nothing.

```javascript
// If ANY part fails, NOTHING is created
await api.createRecipe({
  title: "Recipe",
  ingredients: [...],  // If this fails, recipe isn't created
  steps: [...]         // If this fails, nothing is created
});
```

### Automatic Numbering

- Ingredients: `order` auto-assigned (0, 1, 2...) if not provided
- Steps: `stepNumber` auto-assigned (1, 2, 3...) always

### Cascade Deletes

- Delete user → All recipes deleted
- Delete recipe → All ingredients/steps deleted

### Ownership Validation

All mutations validate user owns the resource. Returns 403 if not.

---

## Quick Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/auth/register` | POST | No | Create account |
| `/auth/login` | POST | No | Login |
| `/auth/logout` | POST | No | Logout |
| `/auth/profile` | GET | Yes | Get profile |
| `/auth/refresh` | GET | Yes | Refresh token |
| `/auth/google` | GET | No | OAuth login |
| `/users` | GET | Yes | List users |
| `/users/me` | GET | Yes | Current user |
| `/users/:username` | GET | Yes | Get user |
| `/users/:username` | PATCH | Yes | Update user |
| `/users/:username` | DELETE | Yes | Delete user |
| `/recipes` | GET | Yes | List recipes |
| `/recipes` | POST | Yes | Create recipe |
| `/recipes/:id` | GET | Yes | Get recipe |
| `/recipes/:id` | PATCH | Yes | Update recipe |
| `/recipes/:id` | DELETE | Yes | Delete recipe |
| `/recipes/:id/ingredients` | POST | Yes | Add ingredient |
| `/recipes/:id/ingredients/:iid` | PATCH | Yes | Update ingredient |
| `/recipes/:id/ingredients/:iid` | DELETE | Yes | Delete ingredient |
| `/recipes/:id/steps` | POST | Yes | Add step |
| `/recipes/:id/steps/:sid` | PATCH | Yes | Update step |
| `/recipes/:id/steps/:sid` | DELETE | Yes | Delete step |
