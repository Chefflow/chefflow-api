# Recipe Steps Module

> **Prefix**: `/recipes/:recipeId/steps`
> **Auth**: All endpoints require JWT

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/recipes/:recipeId/steps` | Add a step to a recipe |
| PATCH | `/recipes/:recipeId/steps/:stepId` | Update a step |
| DELETE | `/recipes/:recipeId/steps/:stepId` | Delete a step |

---

### POST /recipes/:recipeId/steps

Adds a new step to an existing recipe. `stepNumber` is assigned automatically.

**Status Code**: 201 CREATED

**Path Parameters**:
- `recipeId`: Recipe ID

**Request Body**:
```json
{
  "instruction": "Cook pasta in salted water for 10 minutes",  // required, max: 1000 chars
  "duration": 10                                               // optional, min: 0
}
```

**Response** (201 Created):
```json
{
  "id": 3,
  "recipeId": 1,
  "stepNumber": 1,
  "instruction": "Cook pasta in salted water for 10 minutes",
  "duration": 10
}
```

---

### PATCH /recipes/:recipeId/steps/:stepId

Updates a step on a recipe.

**Path Parameters**:
- `recipeId`: Recipe ID
- `stepId`: Step ID

**Request Body** (all fields optional):
```json
{
  "instruction": "Cook pasta in salted water for 12 minutes",
  "duration": 12
}
```

**Response** (200 OK):
```json
{
  "id": 3,
  "recipeId": 1,
  "stepNumber": 1,
  "instruction": "Cook pasta in salted water for 12 minutes",
  "duration": 12
}
```

---

### DELETE /recipes/:recipeId/steps/:stepId

Deletes a step from a recipe.

**Path Parameters**:
- `recipeId`: Recipe ID
- `stepId`: Step ID

**Response**: 204 No Content (empty body)
