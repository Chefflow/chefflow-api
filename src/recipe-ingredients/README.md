# Recipe Ingredients Module

> **Prefix**: `/recipes/:recipeId/ingredients`
> **Auth**: All endpoints require JWT

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/recipes/:recipeId/ingredients` | Add an ingredient to a recipe |
| PATCH | `/recipes/:recipeId/ingredients/:ingredientId` | Update an ingredient |
| DELETE | `/recipes/:recipeId/ingredients/:ingredientId` | Delete an ingredient |

---

### POST /recipes/:recipeId/ingredients

Adds a new ingredient to an existing recipe.

**Status Code**: 201 CREATED

**Path Parameters**:
- `recipeId`: Recipe ID

**Request Body**:
```json
{
  "ingredientName": "Spaghetti",   // required, max: 100 chars
  "quantity": 400,                 // required, min: 0.01
  "unit": "GRAM",                  // required, see unit enum below
  "notes": "Type guanciale",       // optional, max: 500 chars
  "order": 1                       // optional, min: 0
}
```

**Unit enum**: `GRAM`, `KILOGRAM`, `MILLILITER`, `LITER`, `TEASPOON`, `TABLESPOON`, `CUP`, `UNIT`, `PINCH`, `TO_TASTE`

**Response** (201 Created):
```json
{
  "id": 5,
  "recipeId": 1,
  "ingredientName": "Spaghetti",
  "quantity": 400,
  "unit": "GRAM",
  "notes": "Type guanciale",
  "order": 1
}
```

---

### PATCH /recipes/:recipeId/ingredients/:ingredientId

Updates an ingredient on a recipe.

**Path Parameters**:
- `recipeId`: Recipe ID
- `ingredientId`: Ingredient ID

**Request Body** (all fields optional):
```json
{
  "ingredientName": "Spaghetti Premium",
  "quantity": 500,
  "unit": "GRAM",
  "notes": "Better quality",
  "order": 2
}
```

**Response** (200 OK):
```json
{
  "id": 5,
  "recipeId": 1,
  "ingredientName": "Spaghetti Premium",
  "quantity": 500,
  "unit": "GRAM",
  "notes": "Better quality",
  "order": 2
}
```

---

### DELETE /recipes/:recipeId/ingredients/:ingredientId

Deletes an ingredient from a recipe.

**Path Parameters**:
- `recipeId`: Recipe ID
- `ingredientId`: Ingredient ID

**Response**: 204 No Content (empty body)
