# Users Module

> **Prefix**: `/users`
> **Auth**: All endpoints require JWT except `POST /users`

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/users` | No | Create a new user |
| GET | `/users/me` | JWT | Get current user profile |
| GET | `/users` | JWT | Get all users |
| GET | `/users/:username` | JWT | Get user by username |
| PATCH | `/users/:username` | JWT | Update user profile |
| DELETE | `/users/:username` | JWT | Delete user account |

---

### POST /users

Creates a new user.

**Status Code**: 201 CREATED

**Request Body**:
```json
{
  "username": "jane_smith",
  "email": "jane@example.com",
  "name": "Jane Smith",          // optional
  "image": "https://example.com/avatar.jpg",  // optional
  "passwordHash": "a1b2c3d4e5f6...",          // optional (min 8 chars)
  "provider": "LOCAL",           // optional, enum: LOCAL | GOOGLE | APPLE | GITHUB
  "providerId": null             // optional
}
```

**Required fields**: `username`, `email`

**Response** (201 Created):
```json
{
  "username": "jane_smith",
  "email": "jane@example.com",
  "name": "Jane Smith",
  "image": "https://example.com/avatar.jpg",
  "provider": "LOCAL",
  "providerId": null,
  "createdAt": "2026-03-22T11:00:00Z",
  "updatedAt": "2026-03-22T11:00:00Z"
}
```

---

### GET /users/me

Returns the profile of the currently authenticated user.

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

### GET /users

Returns a list of all users.

**Response** (200 OK):
```json
[
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
]
```

---

### GET /users/:username

Returns a specific user by username.

**Path Parameters**:
- `username`: Username to look up

**Response** (200 OK):
```json
{
  "username": "jane_smith",
  "email": "jane@example.com",
  "name": "Jane Smith",
  "image": "https://example.com/avatar.jpg",
  "provider": "LOCAL",
  "providerId": null,
  "createdAt": "2026-03-22T11:00:00Z",
  "updatedAt": "2026-03-22T11:00:00Z"
}
```

---

### PATCH /users/:username

Updates the authenticated user's profile.

**Path Parameters**:
- `username`: Username of the user to update

**Request Body**:
```json
{
  "name": "John Updated",
  "image": "https://example.com/new-avatar.jpg"
}
```

**Response** (200 OK):
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "name": "John Updated",
  "image": "https://example.com/new-avatar.jpg",
  "provider": "LOCAL",
  "providerId": null,
  "createdAt": "2026-03-22T10:30:00Z",
  "updatedAt": "2026-03-22T12:00:00Z"
}
```

**Errors**:
- `403 FORBIDDEN`: "You can only update your own profile"

---

### DELETE /users/:username

Deletes a user account.

**Path Parameters**:
- `username`: Username of the user to delete

**Response**: 204 No Content (empty body)

**Errors**:
- `403 FORBIDDEN`: "You can only delete your own account"

> All recipes, ingredients, and steps belonging to the user are cascade-deleted.
