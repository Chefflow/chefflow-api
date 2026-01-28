# Chefflow API Documentation

Complete endpoint documentation for frontend development.

**Base URL**: `http://localhost:4000` (development) | `https://api.yourdomain.com` (production)

## Table of Contents

- [Key Concepts](#key-concepts)
- [Authentication](#authentication)
- [Users](#users)
- [Recipes](#recipes)
- [Recipe Ingredients](#recipe-ingredients)
- [Recipe Steps](#recipe-steps)
- [HTTP Status Codes](#http-status-codes)
- [Error Handling](#error-handling)
- [Recommended Workflow](#recommended-workflow)

---

## Key Concepts

### Atomic Transactions

When you create a recipe with ingredients and steps in a single request (`POST /recipes`), the backend uses a **database transaction**. This means:

- ✅ **All or nothing**: If any part fails (recipe, ingredient, or step), the entire operation is canceled
- ✅ **No inconsistent states**: You'll never have a half-created recipe in the database
- ✅ **Automatic rollback**: If there's an error, all changes are automatically reverted

**Example**:
```javascript
// This request creates: 1 recipe + 3 ingredients + 2 steps
const recipe = await api.createRecipe({
  title: "Pasta",
  ingredients: [
    { ingredientName: "Pasta", quantity: 400, unit: "GRAM" },
    { ingredientName: "Salt", quantity: 1, unit: "PINCH" },
    { ingredientName: "Oil", quantity: 2, unit: "TABLESPOON" }
  ],
  steps: [
    { instruction: "Boil water" },
    { instruction: "Cook pasta" }
  ]
});

// If something fails (e.g., invalid unit), NOTHING is created
// If everything succeeds, EVERYTHING is created at once
```

### Two Ways to Work with Recipes

#### 1. Atomic Approach (Recommended for creation)
Create everything in a single request:
```javascript
POST /recipes
{
  title: "...",
  ingredients: [...],
  steps: [...]
}
```

#### 2. Incremental Approach (Recommended for editing)
Create/edit individual parts:
```javascript
POST /recipes                          // Create base recipe
POST /recipes/:id/ingredients          // Add ingredient
PATCH /recipes/:id/ingredients/:ingId  // Edit ingredient
DELETE /recipes/:id/steps/:stepId      // Delete step
```

Both approaches are valid. Use the one that best fits your user interface.

---

## Authentication

The API uses **HTTP-only cookie-based** authentication with JWT. Cookies are set automatically after login/registration.

### Cookies

- `accessToken`: JWT access token (valid for 15 minutes)
- `Refresh`: Refresh token (valid for 7 days)

**Important**: The frontend must include `credentials: 'include'` in all fetch/axios requests.

```javascript
fetch('http://localhost:4000/auth/login', {
  credentials: 'include',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'user', password: 'hash' })
})
```

---

### POST /auth/register

Registers a new user.

**Authentication**: Not required (public endpoint)

**Request Body**:
```json
{
  "username": "string (3-30 characters, letters, numbers, hyphens and underscores only)",
  "email": "string (valid email)",
  "password": "string (SHA-256 hash, 64 hexadecimal characters)",
  "name": "string (1-100 characters)"
}
```

**Response** (201 Created):
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

**Note**: Passwords must be hashed on the frontend using SHA-256 before sending.

```javascript
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

---

### POST /auth/login

Logs in with username and password.

**Authentication**: Not required (public endpoint)

**Request Body**:
```json
{
  "username": "string (minimum 3 characters)",
  "password": "string (SHA-256 hash, 64 hexadecimal characters)"
}
```

**Response** (200 OK):
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

**Common Errors**:
- 401: Invalid credentials
- 400: Invalid input data

---

### GET /auth/profile

Gets the authenticated user's profile.

**Authentication**: Required

**Response** (200 OK):
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

Refreshes authentication tokens.

**Authentication**: Requires valid `Refresh` cookie

**Response** (200 OK):
```json
{
  "message": "Tokens refreshed"
}
```

**Note**: Cookies are updated automatically.

---

### POST /auth/logout

Logs out the user.

**Authentication**: Not required (public endpoint)

**Response** (200 OK):
```json
{
  "message": "Logged out successfully"
}
```

**Note**: The `accessToken` and `Refresh` cookies are automatically deleted.

---

### GET /auth/google

Initiates Google OAuth2 authentication flow.

**Authentication**: Not required (public endpoint)

**Usage**: Redirects the user to Google's authorization page.

```html
<a href="http://localhost:4000/auth/google">Sign in with Google</a>
```

---

### GET /auth/google/callback

Google OAuth2 callback (automatically handled by backend).

**Authentication**: Not required (public endpoint)

**Behavior**: After successful authentication, redirects the user to `${FRONTEND_URL}/auth/callback` with cookies set.

---

## Users

### POST /users

Creates a new user (similar to register but more flexible).

**Authentication**: Not required (public endpoint)

**Request Body**:
```json
{
  "username": "string (3-30 characters, letters, numbers, hyphens and underscores only)",
  "email": "string (valid email)",
  "passwordHash": "string (optional)",
  "name": "string (optional, max 100 characters)",
  "image": "string (optional, image URL)",
  "provider": "LOCAL | GOOGLE | APPLE | GITHUB (optional, default: LOCAL)",
  "providerId": "string (optional)"
}
```

**Response** (201 Created):
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "name": "John Doe",
  "image": null,
  "provider": "LOCAL",
  "providerId": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### GET /users/me

Gets the current user's profile.

**Authentication**: Required

**Response** (200 OK):
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "name": "John Doe",
  "image": null,
  "provider": "LOCAL",
  "providerId": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### GET /users

Lists all users.

**Authentication**: Required

**Response** (200 OK):
```json
[
  {
    "username": "johndoe",
    "email": "john@example.com",
    "name": "John Doe",
    "image": null,
    "provider": "LOCAL",
    "providerId": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### GET /users/:username

Gets a user by username.

**Authentication**: Required

**Path Parameters**:
- `username`: User's username

**Response** (200 OK):
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "name": "John Doe",
  "image": null,
  "provider": "LOCAL",
  "providerId": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Errors**:
- 404: User not found

---

### PATCH /users/:username

Updates a user's profile.

**Authentication**: Required

**Authorization**: You can only update your own profile

**Path Parameters**:
- `username`: Username of the user to update

**Request Body** (all fields are optional):
```json
{
  "name": "string (max 100 characters)",
  "image": "string (image URL)"
}
```

**Response** (200 OK):
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "name": "John Updated",
  "image": "https://example.com/avatar.jpg",
  "provider": "LOCAL",
  "providerId": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

**Errors**:
- 403: Forbidden (attempting to update another user's profile)
- 404: User not found

---

### DELETE /users/:username

Deletes a user account.

**Authentication**: Required

**Authorization**: You can only delete your own account

**Path Parameters**:
- `username`: Username of the user to delete

**Response** (204 No Content): No content

**Errors**:
- 403: Forbidden (attempting to delete another user's account)
- 404: User not found

**Note**: This operation deletes the user and all their recipes in cascade.

---

## Recipes

### POST /recipes

Creates a new recipe. Optionally, you can include ingredients and steps in the same request.

**Authentication**: Required

**Request Body**:
```json
{
  "title": "string (required)",
  "description": "string (optional)",
  "servings": "number (optional, minimum 1, default: 1)",
  "prepTime": "number (optional, minutes, minimum 0)",
  "cookTime": "number (optional, minutes, minimum 0)",
  "imageUrl": "string (optional, image URL)",
  "ingredients": [
    {
      "ingredientName": "string (required, max 100 characters)",
      "quantity": "number (required, minimum 0.01)",
      "unit": "GRAM | KILOGRAM | MILLILITER | LITER | TEASPOON | TABLESPOON | CUP | UNIT | PINCH | TO_TASTE",
      "notes": "string (optional, max 500 characters)",
      "order": "number (optional, auto-assigned by index if not specified)"
    }
  ],
  "steps": [
    {
      "instruction": "string (required, max 1000 characters)",
      "duration": "number (optional, minutes, minimum 0)"
    }
  ]
}
```

**Complete Example**:
```json
{
  "title": "Pasta Carbonara",
  "description": "Delicious Italian pasta",
  "servings": 4,
  "prepTime": 10,
  "cookTime": 20,
  "imageUrl": "https://example.com/pasta.jpg",
  "ingredients": [
    {
      "ingredientName": "Pasta",
      "quantity": 400,
      "unit": "GRAM",
      "notes": "Preferably spaghetti"
    },
    {
      "ingredientName": "Eggs",
      "quantity": 4,
      "unit": "UNIT"
    },
    {
      "ingredientName": "Parmesan cheese",
      "quantity": 100,
      "unit": "GRAM"
    }
  ],
  "steps": [
    {
      "instruction": "Boil plenty of salted water in a large pot",
      "duration": 5
    },
    {
      "instruction": "Cook pasta according to package instructions",
      "duration": 10
    },
    {
      "instruction": "Mix eggs with grated cheese in a bowl",
      "duration": 3
    }
  ]
}
```

**Response** (200 OK):
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
    },
    {
      "id": 2,
      "recipeId": 1,
      "ingredientName": "Eggs",
      "quantity": 4,
      "unit": "UNIT",
      "notes": null,
      "order": 1
    },
    {
      "id": 3,
      "recipeId": 1,
      "ingredientName": "Parmesan cheese",
      "quantity": 100,
      "unit": "GRAM",
      "notes": null,
      "order": 2
    }
  ],
  "steps": [
    {
      "id": 1,
      "recipeId": 1,
      "stepNumber": 1,
      "instruction": "Boil plenty of salted water in a large pot",
      "duration": 5
    },
    {
      "id": 2,
      "recipeId": 1,
      "stepNumber": 2,
      "instruction": "Cook pasta according to package instructions",
      "duration": 10
    },
    {
      "id": 3,
      "recipeId": 1,
      "stepNumber": 3,
      "instruction": "Mix eggs with grated cheese in a bowl",
      "duration": 3
    }
  ]
}
```

**Important Notes**:
- The `ingredients` and `steps` arrays are **optional**. You can create an empty recipe and add details later using nested endpoints.
- If you include ingredients without specifying `order`, it's automatically assigned by array index (0, 1, 2...).
- Steps are automatically numbered (`stepNumber`) by array order (1, 2, 3...).
- **Atomic transaction**: If any ingredient or step creation fails, the entire operation is reverted (recipe is not created).
- To create just the base recipe without ingredients or steps, simply omit those fields.

---

### GET /recipes

Lists all recipes for the authenticated user.

**Authentication**: Required

**Response** (200 OK):
```json
[
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
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### GET /recipes/:id

Gets a specific recipe by ID, **including all its ingredients and steps**.

**Authentication**: Required

**Authorization**: You can only view your own recipes

**Path Parameters**:
- `id`: Recipe numeric ID

**Response** (200 OK):
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
    },
    {
      "id": 2,
      "recipeId": 1,
      "ingredientName": "Eggs",
      "quantity": 4,
      "unit": "UNIT",
      "notes": null,
      "order": 1
    }
  ],
  "steps": [
    {
      "id": 1,
      "recipeId": 1,
      "stepNumber": 1,
      "instruction": "Boil salted water",
      "duration": 5
    },
    {
      "id": 2,
      "recipeId": 1,
      "stepNumber": 2,
      "instruction": "Cook pasta",
      "duration": 10
    }
  ]
}
```

**Note**: This endpoint always returns ingredients and steps included, ordered by `order` and `stepNumber` respectively.

**Errors**:
- 404: Recipe not found
- 403: You don't have access to this recipe

---

### PATCH /recipes/:id

Updates an existing recipe.

**Authentication**: Required

**Authorization**: You can only update your own recipes

**Path Parameters**:
- `id`: Recipe numeric ID

**Request Body** (all fields are optional):
```json
{
  "title": "string",
  "description": "string",
  "servings": "number (minimum 1)",
  "prepTime": "number (minimum 0)",
  "cookTime": "number (minimum 0)",
  "imageUrl": "string"
}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "userId": 123,
  "title": "Improved Pasta Carbonara",
  "description": "Delicious Italian pasta with a special touch",
  "servings": 6,
  "prepTime": 15,
  "cookTime": 25,
  "imageUrl": "https://example.com/pasta-new.jpg",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

**Errors**:
- 404: Recipe not found
- 403: You don't have access to this recipe

---

### DELETE /recipes/:id

Deletes a recipe.

**Authentication**: Required

**Authorization**: You can only delete your own recipes

**Path Parameters**:
- `id`: Recipe numeric ID

**Response** (204 No Content): No content

**Errors**:
- 404: Recipe not found
- 403: You don't have access to this recipe

**Note**: This operation deletes the recipe and all its ingredients and steps in cascade.

---

## Recipe Ingredients

### POST /recipes/:recipeId/ingredients

Adds an ingredient to a recipe.

**Authentication**: Required

**Authorization**: You can only add ingredients to your own recipes

**Path Parameters**:
- `recipeId`: Recipe ID

**Request Body**:
```json
{
  "ingredientName": "string (required, max 100 characters)",
  "quantity": "number (required, minimum 0.01)",
  "unit": "GRAM | KILOGRAM | MILLILITER | LITER | TEASPOON | TABLESPOON | CUP | UNIT | PINCH | TO_TASTE (required)",
  "notes": "string (optional, max 500 characters)",
  "order": "number (optional, minimum 0, default: 0)"
}
```

**Unit Examples**:
- `GRAM`: Grams
- `KILOGRAM`: Kilograms
- `MILLILITER`: Milliliters
- `LITER`: Liters
- `TEASPOON`: Teaspoon
- `TABLESPOON`: Tablespoon
- `CUP`: Cup
- `UNIT`: Unit (for counting individual items)
- `PINCH`: Pinch
- `TO_TASTE`: To taste

**Response** (200 OK):
```json
{
  "id": 1,
  "recipeId": 1,
  "ingredientName": "Pasta",
  "quantity": 400,
  "unit": "GRAM",
  "notes": "Preferably spaghetti",
  "order": 0
}
```

**Errors**:
- 404: Recipe not found
- 403: You don't have access to this recipe

---

### PATCH /recipes/:recipeId/ingredients/:ingredientId

Updates a recipe ingredient.

**Authentication**: Required

**Authorization**: You can only update ingredients of your own recipes

**Path Parameters**:
- `recipeId`: Recipe ID
- `ingredientId`: Ingredient ID

**Request Body** (all fields are optional):
```json
{
  "ingredientName": "string (max 100 characters)",
  "quantity": "number (minimum 0.01)",
  "unit": "GRAM | KILOGRAM | MILLILITER | LITER | TEASPOON | TABLESPOON | CUP | UNIT | PINCH | TO_TASTE",
  "notes": "string (max 500 characters)",
  "order": "number (minimum 0)"
}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "recipeId": 1,
  "ingredientName": "Whole wheat pasta",
  "quantity": 500,
  "unit": "GRAM",
  "notes": "Preferably whole wheat spaghetti",
  "order": 0
}
```

**Errors**:
- 404: Recipe or ingredient not found
- 403: You don't have access to this recipe

---

### DELETE /recipes/:recipeId/ingredients/:ingredientId

Deletes an ingredient from a recipe.

**Authentication**: Required

**Authorization**: You can only delete ingredients from your own recipes

**Path Parameters**:
- `recipeId`: Recipe ID
- `ingredientId`: Ingredient ID

**Response** (204 No Content): No content

**Errors**:
- 404: Recipe or ingredient not found
- 403: You don't have access to this recipe

---

## Recipe Steps

### POST /recipes/:recipeId/steps

Adds a step to a recipe.

**Authentication**: Required

**Authorization**: You can only add steps to your own recipes

**Path Parameters**:
- `recipeId`: Recipe ID

**Request Body**:
```json
{
  "instruction": "string (required, max 1000 characters)",
  "duration": "number (optional, minutes, minimum 0)"
}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "recipeId": 1,
  "stepNumber": 1,
  "instruction": "Boil salted water in a large pot",
  "duration": 5
}
```

**Note**: The `stepNumber` is automatically assigned sequentially.

**Errors**:
- 404: Recipe not found
- 403: You don't have access to this recipe

---

### PATCH /recipes/:recipeId/steps/:stepId

Updates a recipe step.

**Authentication**: Required

**Authorization**: You can only update steps of your own recipes

**Path Parameters**:
- `recipeId`: Recipe ID
- `stepId`: Step ID

**Request Body** (all fields are optional):
```json
{
  "instruction": "string (max 1000 characters)",
  "duration": "number (minutes, minimum 0)"
}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "recipeId": 1,
  "stepNumber": 1,
  "instruction": "Boil plenty of salted water in a large pot",
  "duration": 10
}
```

**Errors**:
- 404: Recipe or step not found
- 403: You don't have access to this recipe

---

### DELETE /recipes/:recipeId/steps/:stepId

Deletes a step from a recipe.

**Authentication**: Required

**Authorization**: You can only delete steps from your own recipes

**Path Parameters**:
- `recipeId`: Recipe ID
- `stepId`: Step ID

**Response** (204 No Content): No content

**Errors**:
- 404: Recipe or step not found
- 403: You don't have access to this recipe

---

## HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful operation (GET, PATCH, POST without resource creation) |
| 201 | Created | Resource created successfully (POST) |
| 204 | No Content | Successful operation with no response content (DELETE) |
| 400 | Bad Request | Invalid or missing input data |
| 401 | Unauthorized | Not authenticated (invalid or missing token) |
| 403 | Forbidden | Authenticated but lacking permissions for the operation |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded (10 req/min) |
| 500 | Internal Server Error | Server error |

---

## Error Handling

All errors follow NestJS standard format:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### Validation Errors

When there are validation errors, the message includes specific details:

```json
{
  "statusCode": 400,
  "message": [
    "username must be longer than or equal to 3 characters",
    "email must be an email"
  ],
  "error": "Bad Request"
}
```

### Authentication Errors

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### Authorization Errors

```json
{
  "statusCode": 403,
  "message": "You do not have access to this recipe"
}
```

### Not Found Errors

```json
{
  "statusCode": 404,
  "message": "Recipe with ID 999 not found"
}
```

### Rate Limiting

When the limit of 10 requests per 60 seconds is exceeded:

```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

---

## Recommended Workflow

### Option 1: Create Complete Recipe at Once (Recommended)

Use this option when the user creates a new recipe with all data available.

```javascript
const newRecipe = await api.createRecipe({
  title: "Pasta Carbonara",
  servings: 4,
  prepTime: 10,
  cookTime: 20,
  ingredients: [
    { ingredientName: "Pasta", quantity: 400, unit: "GRAM" },
    { ingredientName: "Eggs", quantity: 4, unit: "UNIT" },
    { ingredientName: "Parmesan cheese", quantity: 100, unit: "GRAM" }
  ],
  steps: [
    { instruction: "Boil salted water", duration: 5 },
    { instruction: "Cook pasta", duration: 10 },
    { instruction: "Mix with eggs and cheese", duration: 3 }
  ]
});

// The response includes the complete recipe with created ingredients and steps
console.log(newRecipe.ingredients.length); // 3
console.log(newRecipe.steps.length); // 3
```

**Advantages**:
- ✅ Single HTTP request
- ✅ Atomic transaction (all or nothing)
- ✅ Better user experience
- ✅ Ingredients and steps numbered automatically

**How it works internally**:
The backend uses a **database transaction**. If any ingredient or step creation fails, **the entire operation is canceled** (including the recipe). This ensures you'll never have incomplete recipes in the database.

---

### Option 2: Create Empty Recipe and Add Later

Use this option when the user wants to save the recipe first and add details later.

```javascript
// 1. Create base recipe (without ingredients or steps)
const recipe = await api.createRecipe({
  title: "Pasta Carbonara",
  servings: 4
});

// 2. Later, add ingredients one by one
await api.addIngredient(recipe.id, {
  ingredientName: "Pasta",
  quantity: 400,
  unit: "GRAM"
});

await api.addIngredient(recipe.id, {
  ingredientName: "Eggs",
  quantity: 4,
  unit: "UNIT"
});

// 3. Add steps one by one
await api.addStep(recipe.id, {
  instruction: "Boil salted water",
  duration: 5
});
```

**Advantages**:
- ✅ Flexibility to build the recipe gradually
- ✅ Useful for multi-step forms

**Disadvantages**:
- ⚠️ Multiple HTTP requests
- ⚠️ Recipe might be left incomplete if user doesn't finish

---

### Option 3: Edit Existing Recipe

Use specific endpoints for targeted modifications.

```javascript
// Change only base recipe fields
await api.updateRecipe(recipeId, {
  title: "Improved Pasta Carbonara",
  servings: 6,
  prepTime: 15
});

// Add a new ingredient
await api.addIngredient(recipeId, {
  ingredientName: "Bacon",
  quantity: 150,
  unit: "GRAM"
});

// Edit a specific ingredient (without affecting others)
await api.updateIngredient(recipeId, ingredientId, {
  quantity: 200  // Only change the quantity
});

// Delete a step
await api.deleteStep(recipeId, stepId);

// Add a new step at the end
await api.addStep(recipeId, {
  instruction: "Serve hot with parmesan cheese",
  duration: 1
});
```

**Advantages**:
- ✅ Only send data that changes
- ✅ More efficient for small edits
- ✅ Better for interactive interfaces (inline ingredient editing)

---

### Strategy Comparison

| Scenario | Recommended Strategy |
|----------|---------------------|
| User creates new recipe with complete form | **Option 1** - One request with everything |
| User saves recipe and adds ingredients later | **Option 2** - Create empty, then add |
| User edits existing recipe title | **Option 3** - PATCH /recipes/:id |
| User adds ingredient to existing recipe | **Option 3** - POST /recipes/:id/ingredients |
| User edits ingredient quantity | **Option 3** - PATCH /recipes/:id/ingredients/:ingredientId |
| User deletes a step | **Option 3** - DELETE /recipes/:id/steps/:stepId |

---

## JavaScript Client Example

```javascript
class ChefflowAPI {
  constructor(baseURL = 'http://localhost:4000') {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const response = await fetch(url, config);

    if (response.status === 204) {
      return null;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  }

  async hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async register(username, email, password, name) {
    const hashedPassword = await this.hashPassword(password);
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username,
        email,
        password: hashedPassword,
        name,
      }),
    });
  }

  async login(username, password) {
    const hashedPassword = await this.hashPassword(password);
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username,
        password: hashedPassword,
      }),
    });
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  async refreshTokens() {
    return this.request('/auth/refresh');
  }

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
    return this.request(`/recipes/${id}`, {
      method: 'DELETE',
    });
  }

  async addIngredient(recipeId, ingredientData) {
    return this.request(`/recipes/${recipeId}/ingredients`, {
      method: 'POST',
      body: JSON.stringify(ingredientData),
    });
  }

  async updateIngredient(recipeId, ingredientId, ingredientData) {
    return this.request(`/recipes/${recipeId}/ingredients/${ingredientId}`, {
      method: 'PATCH',
      body: JSON.stringify(ingredientData),
    });
  }

  async deleteIngredient(recipeId, ingredientId) {
    return this.request(`/recipes/${recipeId}/ingredients/${ingredientId}`, {
      method: 'DELETE',
    });
  }

  async addStep(recipeId, stepData) {
    return this.request(`/recipes/${recipeId}/steps`, {
      method: 'POST',
      body: JSON.stringify(stepData),
    });
  }

  async updateStep(recipeId, stepId, stepData) {
    return this.request(`/recipes/${recipeId}/steps/${stepId}`, {
      method: 'PATCH',
      body: JSON.stringify(stepData),
    });
  }

  async deleteStep(recipeId, stepId) {
    return this.request(`/recipes/${recipeId}/steps/${stepId}`, {
      method: 'DELETE',
    });
  }
}

// Usage example
const api = new ChefflowAPI();

// Example 1: Login and get recipes
try {
  const result = await api.login('johndoe', 'mypassword123');
  console.log('Login successful:', result);

  const recipes = await api.getRecipes();
  console.log('User recipes:', recipes);
} catch (error) {
  console.error('Error:', error.message);
}

// Example 2: Create complete recipe (atomic transaction)
try {
  const newRecipe = await api.createRecipe({
    title: "Pasta Carbonara",
    description: "Classic Italian recipe",
    servings: 4,
    prepTime: 10,
    cookTime: 15,
    ingredients: [
      { ingredientName: "Spaghetti", quantity: 400, unit: "GRAM" },
      { ingredientName: "Eggs", quantity: 4, unit: "UNIT" },
      { ingredientName: "Parmesan cheese", quantity: 100, unit: "GRAM" },
      { ingredientName: "Pancetta", quantity: 150, unit: "GRAM" }
    ],
    steps: [
      { instruction: "Boil salted water in a large pot", duration: 5 },
      { instruction: "Cook pasta according to instructions", duration: 10 },
      { instruction: "Fry pancetta until crispy", duration: 5 },
      { instruction: "Beat eggs with grated cheese", duration: 2 },
      { instruction: "Mix everything and serve immediately", duration: 3 }
    ]
  });

  console.log('Recipe created successfully:', newRecipe);
  console.log(`Created ${newRecipe.ingredients.length} ingredients`);
  console.log(`Created ${newRecipe.steps.length} steps`);
} catch (error) {
  console.error('Error creating recipe:', error.message);
  // If it fails, NOTHING was created (atomic transaction)
}

// Example 3: Edit specific ingredient
try {
  await api.updateIngredient(recipeId, ingredientId, {
    quantity: 500,  // Change quantity from 400g to 500g
    notes: "Use whole wheat pasta"
  });
  console.log('Ingredient updated');
} catch (error) {
  console.error('Error:', error.message);
}
```

---

## CORS Configuration

The API is configured to accept requests from the following origins (configurable via `ALLOWED_ORIGINS`):

- `http://localhost:3000` (default)
- `http://localhost:5173` (Vite)
- `http://localhost:4200` (Angular)

**Allowed Methods**: GET, POST, PUT, PATCH, DELETE, OPTIONS

**Allowed Headers**: Content-Type, Authorization

**Credentials**: Enabled (required for cookies)

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Limit**: 10 requests per time window
- **Window**: 60 seconds (1 minute)
- **Scope**: Applies to all endpoints (including public ones)

When the limit is exceeded, you'll receive a 429 Too Many Requests error.

**Configuration** (environment variables):
- `THROTTLE_TTL`: Window duration in milliseconds (default: 60000)
- `THROTTLE_LIMIT`: Number of allowed requests (default: 10)

---

## Important Notes

1. **Password Hashing**: Passwords MUST be hashed on the client using SHA-256 before sending to the server.

2. **HTTP-Only Cookies**: Authentication cookies are HTTP-only and secure, so they're not accessible from JavaScript.

3. **Credentials**: ALWAYS include `credentials: 'include'` in fetch requests.

4. **Token Refresh**: The access token expires in 15 minutes. Implement an interceptor to refresh automatically when receiving a 401.

5. **Validation**: All data is validated automatically. Validation errors include specific details.

6. **Atomic Transactions**: When creating a recipe with ingredients and steps, a database transaction is used. If any part fails (recipe, ingredient, or step), the entire operation is automatically canceled. This ensures you'll never have inconsistent data.

7. **Cascade Delete**: When deleting a user, all their recipes are deleted. When deleting a recipe, all its ingredients and steps are automatically deleted.

8. **Ownership**: You can only access, modify, and delete your own resources (recipes, ingredients, steps).

9. **Automatic Numbering**:
   - Ingredients are automatically ordered if you don't specify `order` (0, 1, 2...).
   - Steps are automatically numbered with `stepNumber` (1, 2, 3...).

10. **GET /recipes/:id**: Always returns ingredients and steps included. You don't need to make additional requests to get them.

---

## Frequently Asked Questions

### Can I create a recipe without ingredients or steps?

Yes. The `ingredients` and `steps` arrays are completely optional. You can create an empty recipe and add details later:

```javascript
const recipe = await api.createRecipe({
  title: "My Recipe",
  servings: 4
});
// Recipe created without ingredients or steps
```

### What happens if an ingredient creation fails when creating a complete recipe?

The transaction is automatically canceled and **nothing** is created in the database. You'll receive an error explaining what went wrong, but you won't have inconsistent data.

### How do I add ingredients to an existing recipe?

Use the nested endpoint `POST /recipes/:recipeId/ingredients`:

```javascript
await api.addIngredient(recipeId, {
  ingredientName: "Salt",
  quantity: 1,
  unit: "PINCH"
});
```

### Can I update only one field of an ingredient without sending all the others?

Yes. PATCH endpoints are partial. Only send the fields you want to change:

```javascript
// Only change quantity
await api.updateIngredient(recipeId, ingredientId, {
  quantity: 500
});
```

### Does the order of ingredients and steps matter?

Yes. Ingredients are ordered by the `order` field (0, 1, 2...) and steps by `stepNumber` (1, 2, 3...). If you don't specify `order` when creating ingredients, it's automatically assigned by array index.

### Can I reorder steps after creating them?

Currently there's no specific endpoint for reordering. You would need to manually update the `stepNumber` of each step with PATCH, though this is not recommended. Best practice is to delete and recreate steps in the correct order if you need to significantly reorganize.

### What happens to ingredients and steps when I delete a recipe?

They're automatically deleted in cascade. You don't need to manually delete them one by one.

### Can I get just basic recipe information without ingredients and steps?

No. The `GET /recipes/:id` endpoint always includes ingredients and steps. If you only need basic information, use `GET /recipes` which lists all recipes without nested details.

### How do I handle automatic token refresh?

Implement an interceptor that detects 401 errors and automatically calls `/auth/refresh`:

```javascript
async request(endpoint, options = {}) {
  try {
    return await this._doRequest(endpoint, options);
  } catch (error) {
    if (error.statusCode === 401) {
      // Token expired, try refresh
      await this.refreshTokens();
      // Retry original request
      return await this._doRequest(endpoint, options);
    }
    throw error;
  }
}
```

### Why hash passwords on the client?

So the plaintext password never travels over the network, even over HTTPS. It's an additional security layer. The backend re-hashes with bcrypt before storing.
