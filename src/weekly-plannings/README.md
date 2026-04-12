# Weekly Plannings Module

> **Prefix**: `/weekly-plannings`
> **Auth**: All endpoints require JWT

---

## Notes

- `weekStart` must be a **Monday** in ISO date format (`YYYY-MM-DD`)
- `weekEnd` is calculated automatically on the server (`weekStart + 6 days`)
- Slots are identified by `dayOfWeek` + `slotNumber` (1, 2, or 3)
- Valid `DayOfWeek` values: `MONDAY`, `TUESDAY`, `WEDNESDAY`, `THURSDAY`, `FRIDAY`, `SATURDAY`, `SUNDAY` (case-insensitive in the URL)

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/weekly-plannings` | Create a weekly planning |
| GET | `/weekly-plannings` | Get all plannings (no slots) |
| GET | `/weekly-plannings/:id` | Get planning with slots and recipes |
| PATCH | `/weekly-plannings/:id` | Update planning week |
| DELETE | `/weekly-plannings/:id` | Delete planning and all slots |
| PUT | `/weekly-plannings/:id/slots/:day/:slot` | Assign or replace a recipe in a slot |
| DELETE | `/weekly-plannings/:id/slots/:day/:slot` | Delete a slot |

---

### POST /weekly-plannings

Creates a new weekly planning.

**Status Code**: 201 CREATED

**Request Body**:
```json
{
  "weekStart": "2026-04-06"   // required, must be a Monday (YYYY-MM-DD)
}
```

**Response** (201 Created):
```json
{
  "id": 1,
  "userId": 123,
  "weekStart": "2026-04-06T00:00:00.000Z",
  "weekEnd": "2026-04-12T00:00:00.000Z",
  "createdAt": "2026-04-09T10:00:00.000Z",
  "updatedAt": "2026-04-09T10:00:00.000Z",
  "slots": []
}
```

**Errors**:
- `400 BAD_REQUEST`: `weekStart` is not a Monday or not a valid date
- `409 CONFLICT`: A planning for that week already exists

---

### GET /weekly-plannings

Returns all plannings for the authenticated user. Slots are not included.

**Response** (200 OK):
```json
[
  {
    "id": 1,
    "userId": 123,
    "weekStart": "2026-04-06T00:00:00.000Z",
    "weekEnd": "2026-04-12T00:00:00.000Z",
    "createdAt": "2026-04-09T10:00:00.000Z",
    "updatedAt": "2026-04-09T10:00:00.000Z"
  }
]
```

> Use the detail endpoint to get slots.

---

### GET /weekly-plannings/:id

Returns a planning with all its slots and recipe data.

**Path Parameters**:
- `id`: Planning ID

**Response** (200 OK):
```json
{
  "id": 1,
  "userId": 123,
  "weekStart": "2026-04-06T00:00:00.000Z",
  "weekEnd": "2026-04-12T00:00:00.000Z",
  "createdAt": "2026-04-09T10:00:00.000Z",
  "updatedAt": "2026-04-09T10:00:00.000Z",
  "slots": [
    {
      "id": 1,
      "weeklyPlanningId": 1,
      "dayOfWeek": "MONDAY",
      "slotNumber": 1,
      "recipeId": 5,
      "recipe": {
        "id": 5,
        "userId": 123,
        "title": "Pasta Carbonara",
        "description": "Classic Italian recipe",
        "servings": 4,
        "prepTime": 10,
        "cookTime": 20,
        "imageUrl": "https://example.com/carbonara.jpg",
        "createdAt": "2026-03-22T12:00:00.000Z",
        "updatedAt": "2026-03-22T12:00:00.000Z"
      }
    }
  ]
}
```

**Errors**:
- `403 FORBIDDEN`: Planning does not belong to the user
- `404 NOT_FOUND`: Planning not found

---

### PATCH /weekly-plannings/:id

Updates the week of an existing planning.

**Path Parameters**:
- `id`: Planning ID

**Request Body**:
```json
{
  "weekStart": "2026-04-13"   // must be a Monday
}
```

**Response** (200 OK): Same format as GET by ID (with slots).

**Errors**:
- `400 BAD_REQUEST`: `weekStart` is not a Monday
- `403 FORBIDDEN`: Not the owner
- `404 NOT_FOUND`: Not found
- `409 CONFLICT`: A planning for that week already exists

---

### DELETE /weekly-plannings/:id

Deletes a planning and all its slots in cascade.

**Path Parameters**:
- `id`: Planning ID

**Response**: 204 No Content (empty body)

**Errors**:
- `403 FORBIDDEN`: Not the owner
- `404 NOT_FOUND`: Not found

---

### PUT /weekly-plannings/:id/slots/:day/:slot

Assigns or replaces a recipe in a specific slot (day + slot number).

**Path Parameters**:
- `id`: Planning ID
- `day`: Day of the week (e.g. `monday`, `MONDAY` — case-insensitive)
- `slot`: Slot number (`1`, `2`, or `3`)

**Request Body**:
```json
{
  "recipeId": 5   // required, must belong to the authenticated user
}
```

**Behavior**: If the slot already exists, replaces the assigned recipe. If not, creates it.

**Response** (200 OK):
```json
{
  "id": 1,
  "weeklyPlanningId": 1,
  "dayOfWeek": "MONDAY",
  "slotNumber": 1,
  "recipeId": 5,
  "recipe": {
    "id": 5,
    "userId": 123,
    "title": "Pasta Carbonara",
    "description": "Classic Italian recipe",
    "servings": 4,
    "prepTime": 10,
    "cookTime": 20,
    "imageUrl": "https://example.com/carbonara.jpg",
    "createdAt": "2026-03-22T12:00:00.000Z",
    "updatedAt": "2026-03-22T12:00:00.000Z"
  }
}
```

**Errors**:
- `400 BAD_REQUEST`: `day` is invalid or `slot` is not 1, 2, or 3
- `403 FORBIDDEN`: Planning or recipe does not belong to the user
- `404 NOT_FOUND`: Planning or recipe not found

---

### DELETE /weekly-plannings/:id/slots/:day/:slot

Deletes a specific slot from a planning.

**Path Parameters**:
- `id`: Planning ID
- `day`: Day of the week (case-insensitive)
- `slot`: Slot number (`1`, `2`, or `3`)

**Response**: 204 No Content (empty body)

**Errors**:
- `400 BAD_REQUEST`: `day` or `slot` invalid
- `403 FORBIDDEN`: Planning does not belong to the user
- `404 NOT_FOUND`: Planning or slot not found
