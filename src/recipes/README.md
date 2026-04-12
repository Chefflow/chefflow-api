# Recipes Module

> **Prefix**: `/recipes`
> **Auth**: All endpoints require JWT

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/recipes` | Create a recipe |
| GET | `/recipes` | Get all recipes for authenticated user |
| GET | `/recipes/:id` | Get recipe by ID (with ingredients and steps) |
| PATCH | `/recipes/:id` | Update a recipe |
| DELETE | `/recipes/:id` | Delete a recipe |

---

### POST /recipes

Creates a new recipe. Ingredients and steps can be included in the same request.

**Status Code**: 201 CREATED

**Request Body**:
```json
{
  "title": "Pasta Carbonara",                        // required
  "description": "Classic Italian recipe",           // optional
  "servings": 4,                                     // optional, min: 1
  "prepTime": 10,                                    // optional, min: 0
  "cookTime": 20,                                    // optional, min: 0
  "imageUrl": "https://example.com/carbonara.jpg",   // optional
  "ingredients": [                                   // optional
    {
      "ingredientName": "Spaghetti",                 // required, max: 100 chars
      "quantity": 400,                               // required, min: 0.01
      "unit": "GRAM",                                // required, see unit enum below
      "notes": "Type guanciale",                     // optional, max: 500 chars
      "order": 1                                     // optional, min: 0
    }
  ],
  "steps": [                                         // optional
    {
      "instruction": "Cook pasta in salted water",   // required, max: 1000 chars
      "duration": 10                                 // optional, min: 0
    }
  ]
}
```

**Unit enum**: `GRAM`, `KILOGRAM`, `MILLILITER`, `LITER`, `TEASPOON`, `TABLESPOON`, `CUP`, `UNIT`, `PINCH`, `TO_TASTE`

**Response** (201 Created):
```json
{
  "id": 1,
  "userId": 123,
  "title": "Pasta Carbonara",
  "description": "Classic Italian recipe",
  "servings": 4,
  "prepTime": 10,
  "cookTime": 20,
  "imageUrl": "https://example.com/carbonara.jpg",
  "createdAt": "2026-03-22T12:00:00Z",
  "updatedAt": "2026-03-22T12:00:00Z"
}
```

---

### GET /recipes

Returns all recipes belonging to the authenticated user.

**Response** (200 OK):
```json
[
  {
    "id": 1,
    "userId": 123,
    "title": "Pasta Carbonara",
    "description": "Classic Italian recipe",
    "servings": 4,
    "prepTime": 10,
    "cookTime": 20,
    "imageUrl": "https://example.com/carbonara.jpg",
    "createdAt": "2026-03-22T12:00:00Z",
    "updatedAt": "2026-03-22T12:00:00Z"
  }
]
```

---

### GET /recipes/:id

Returns a single recipe with its full ingredients and steps.

**Path Parameters**:
- `id`: Recipe ID

**Response** (200 OK):
```json
{
  "id": 1,
  "userId": 123,
  "title": "Pasta Carbonara",
  "description": "Classic Italian recipe",
  "servings": 4,
  "prepTime": 10,
  "cookTime": 20,
  "imageUrl": "https://example.com/carbonara.jpg",
  "createdAt": "2026-03-22T12:00:00Z",
  "updatedAt": "2026-03-22T12:00:00Z",
  "ingredients": [
    {
      "id": 1,
      "recipeId": 1,
      "ingredientName": "Spaghetti",
      "quantity": 400,
      "unit": "GRAM",
      "notes": "Type guanciale",
      "order": 1
    }
  ],
  "steps": [
    {
      "id": 1,
      "recipeId": 1,
      "stepNumber": 1,
      "instruction": "Cook pasta in salted water",
      "duration": 10
    }
  ]
}
```

---

### PATCH /recipes/:id

Updates an existing recipe.

**Path Parameters**:
- `id`: Recipe ID

**Request Body** (all fields optional):
```json
{
  "title": "Pasta Carbonara Updated",
  "description": "Improved recipe",
  "servings": 6,
  "prepTime": 15,
  "cookTime": 25,
  "imageUrl": "https://example.com/carbonara-v2.jpg"
}
```

**Response** (200 OK): Same format as GET by ID (without ingredients/steps).

---

### DELETE /recipes/:id

Deletes a recipe.

**Path Parameters**:
- `id`: Recipe ID

**Response**: 204 No Content (empty body)

> All ingredients and steps belonging to the recipe are cascade-deleted.
