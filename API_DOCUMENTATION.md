# Chefflow API Documentation

Documentación completa de endpoints para desarrollo del frontend.

**Base URL**: `http://localhost:4000` (desarrollo) | `https://api.tudominio.com` (producción)

## Tabla de Contenidos

- [Conceptos Clave](#conceptos-clave)
- [Autenticación](#autenticación)
- [Usuarios](#usuarios)
- [Recetas](#recetas)
- [Ingredientes de Recetas](#ingredientes-de-recetas)
- [Pasos de Recetas](#pasos-de-recetas)
- [Códigos de Estado HTTP](#códigos-de-estado-http)
- [Manejo de Errores](#manejo-de-errores)
- [Flujo de Trabajo Recomendado](#flujo-de-trabajo-recomendado)

---

## Conceptos Clave

### Transacciones Atómicas

Cuando creas una receta con ingredientes y pasos en una sola petición (`POST /recipes`), el backend utiliza una **transacción de base de datos**. Esto significa:

- ✅ **Todo o nada**: Si falla la creación de cualquier parte (receta, ingrediente o paso), toda la operación se cancela
- ✅ **Sin estados inconsistentes**: Nunca tendrás una receta a medias en la base de datos
- ✅ **Rollback automático**: Si hay un error, se revierten todos los cambios automáticamente

**Ejemplo**:
```javascript
// Esta petición crea: 1 receta + 3 ingredientes + 2 pasos
const recipe = await api.createRecipe({
  title: "Pasta",
  ingredients: [
    { ingredientName: "Pasta", quantity: 400, unit: "GRAM" },
    { ingredientName: "Sal", quantity: 1, unit: "PINCH" },
    { ingredientName: "Aceite", quantity: 2, unit: "TABLESPOON" }
  ],
  steps: [
    { instruction: "Hervir agua" },
    { instruction: "Cocinar pasta" }
  ]
});

// Si algo falla (ej: unidad inválida), NO se crea NADA
// Si todo sale bien, se crea TODO de una vez
```

### Dos Formas de Trabajar con Recetas

#### 1. Enfoque Atómico (Recomendado para creación)
Crear todo en una sola petición:
```javascript
POST /recipes
{
  title: "...",
  ingredients: [...],
  steps: [...]
}
```

#### 2. Enfoque Incremental (Recomendado para edición)
Crear/editar partes individuales:
```javascript
POST /recipes                          // Crear receta base
POST /recipes/:id/ingredients          // Añadir ingrediente
PATCH /recipes/:id/ingredients/:ingId  // Editar ingrediente
DELETE /recipes/:id/steps/:stepId      // Eliminar paso
```

Ambos enfoques son válidos. Usa el que mejor se adapte a tu interfaz de usuario.

---

## Autenticación

La API utiliza autenticación basada en **cookies HTTP-only** con JWT. Las cookies se establecen automáticamente después del login/registro.

### Cookies

- `accessToken`: Token de acceso JWT (válido por 15 minutos)
- `Refresh`: Token de refresco (válido por 7 días)

**Importante**: El frontend debe incluir `credentials: 'include'` en todas las peticiones fetch/axios.

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

Registra un nuevo usuario.

**Autenticación**: No requerida (endpoint público)

**Request Body**:
```json
{
  "username": "string (3-30 caracteres, solo letras, números, guiones y guiones bajos)",
  "email": "string (email válido)",
  "password": "string (SHA-256 hash de 64 caracteres hexadecimales)",
  "name": "string (1-100 caracteres)"
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

**Nota**: La contraseña debe hashearse en el frontend usando SHA-256 antes de enviarla.

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

Inicia sesión con usuario y contraseña.

**Autenticación**: No requerida (endpoint público)

**Request Body**:
```json
{
  "username": "string (mínimo 3 caracteres)",
  "password": "string (SHA-256 hash de 64 caracteres hexadecimales)"
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

**Errores Comunes**:
- 401: Credenciales inválidas
- 400: Datos de entrada inválidos

---

### GET /auth/profile

Obtiene el perfil del usuario autenticado.

**Autenticación**: Requerida

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

Refresca los tokens de autenticación.

**Autenticación**: Requiere cookie `Refresh` válida

**Response** (200 OK):
```json
{
  "message": "Tokens refreshed"
}
```

**Nota**: Las cookies se actualizan automáticamente.

---

### POST /auth/logout

Cierra la sesión del usuario.

**Autenticación**: No requerida (endpoint público)

**Response** (200 OK):
```json
{
  "message": "Logged out successfully"
}
```

**Nota**: Las cookies `accessToken` y `Refresh` se eliminan automáticamente.

---

### GET /auth/google

Inicia el flujo de autenticación con Google OAuth2.

**Autenticación**: No requerida (endpoint público)

**Uso**: Redirige al usuario a la página de autorización de Google.

```html
<a href="http://localhost:4000/auth/google">Iniciar sesión con Google</a>
```

---

### GET /auth/google/callback

Callback de Google OAuth2 (manejado automáticamente por el backend).

**Autenticación**: No requerida (endpoint público)

**Comportamiento**: Después de la autenticación exitosa, redirige al usuario a `${FRONTEND_URL}/auth/callback` con las cookies establecidas.

---

## Usuarios

### POST /users

Crea un nuevo usuario (similar a register pero más flexible).

**Autenticación**: No requerida (endpoint público)

**Request Body**:
```json
{
  "username": "string (3-30 caracteres, solo letras, números, guiones y guiones bajos)",
  "email": "string (email válido)",
  "passwordHash": "string (opcional)",
  "name": "string (opcional, máximo 100 caracteres)",
  "image": "string (opcional, URL de imagen)",
  "provider": "LOCAL | GOOGLE | APPLE | GITHUB (opcional, default: LOCAL)",
  "providerId": "string (opcional)"
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

Obtiene el perfil del usuario actual.

**Autenticación**: Requerida

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

Lista todos los usuarios.

**Autenticación**: Requerida

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

Obtiene un usuario por su username.

**Autenticación**: Requerida

**Path Parameters**:
- `username`: Username del usuario

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

**Errores**:
- 404: Usuario no encontrado

---

### PATCH /users/:username

Actualiza el perfil de un usuario.

**Autenticación**: Requerida

**Autorización**: Solo puedes actualizar tu propio perfil

**Path Parameters**:
- `username`: Username del usuario a actualizar

**Request Body** (todos los campos son opcionales):
```json
{
  "name": "string (máximo 100 caracteres)",
  "image": "string (URL de imagen)"
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

**Errores**:
- 403: Forbidden (intentando actualizar perfil de otro usuario)
- 404: Usuario no encontrado

---

### DELETE /users/:username

Elimina una cuenta de usuario.

**Autenticación**: Requerida

**Autorización**: Solo puedes eliminar tu propia cuenta

**Path Parameters**:
- `username`: Username del usuario a eliminar

**Response** (204 No Content): Sin contenido

**Errores**:
- 403: Forbidden (intentando eliminar cuenta de otro usuario)
- 404: Usuario no encontrado

**Nota**: Esta operación elimina el usuario y todas sus recetas en cascada.

---

## Recetas

### POST /recipes

Crea una nueva receta. Opcionalmente, puedes incluir ingredientes y pasos en la misma petición.

**Autenticación**: Requerida

**Request Body**:
```json
{
  "title": "string (requerido)",
  "description": "string (opcional)",
  "servings": "number (opcional, mínimo 1, default: 1)",
  "prepTime": "number (opcional, minutos, mínimo 0)",
  "cookTime": "number (opcional, minutos, mínimo 0)",
  "imageUrl": "string (opcional, URL de imagen)",
  "ingredients": [
    {
      "ingredientName": "string (requerido, máximo 100 caracteres)",
      "quantity": "number (requerido, mínimo 0.01)",
      "unit": "GRAM | KILOGRAM | MILLILITER | LITER | TEASPOON | TABLESPOON | CUP | UNIT | PINCH | TO_TASTE",
      "notes": "string (opcional, máximo 500 caracteres)",
      "order": "number (opcional, se asigna automáticamente por índice si no se especifica)"
    }
  ],
  "steps": [
    {
      "instruction": "string (requerido, máximo 1000 caracteres)",
      "duration": "number (opcional, minutos, mínimo 0)"
    }
  ]
}
```

**Ejemplo completo**:
```json
{
  "title": "Pasta Carbonara",
  "description": "Deliciosa pasta italiana",
  "servings": 4,
  "prepTime": 10,
  "cookTime": 20,
  "imageUrl": "https://example.com/pasta.jpg",
  "ingredients": [
    {
      "ingredientName": "Pasta",
      "quantity": 400,
      "unit": "GRAM",
      "notes": "Preferiblemente spaghetti"
    },
    {
      "ingredientName": "Huevos",
      "quantity": 4,
      "unit": "UNIT"
    },
    {
      "ingredientName": "Queso parmesano",
      "quantity": 100,
      "unit": "GRAM"
    }
  ],
  "steps": [
    {
      "instruction": "Hervir abundante agua con sal en una olla grande",
      "duration": 5
    },
    {
      "instruction": "Cocinar la pasta según las instrucciones del paquete",
      "duration": 10
    },
    {
      "instruction": "Mezclar los huevos con el queso rallado en un bol",
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
  "description": "Deliciosa pasta italiana",
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
      "notes": "Preferiblemente spaghetti",
      "order": 0
    },
    {
      "id": 2,
      "recipeId": 1,
      "ingredientName": "Huevos",
      "quantity": 4,
      "unit": "UNIT",
      "notes": null,
      "order": 1
    },
    {
      "id": 3,
      "recipeId": 1,
      "ingredientName": "Queso parmesano",
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
      "instruction": "Hervir abundante agua con sal en una olla grande",
      "duration": 5
    },
    {
      "id": 2,
      "recipeId": 1,
      "stepNumber": 2,
      "instruction": "Cocinar la pasta según las instrucciones del paquete",
      "duration": 10
    },
    {
      "id": 3,
      "recipeId": 1,
      "stepNumber": 3,
      "instruction": "Mezclar los huevos con el queso rallado en un bol",
      "duration": 3
    }
  ]
}
```

**Notas importantes**:
- Los arrays `ingredients` y `steps` son **opcionales**. Puedes crear una receta vacía y añadir ingredientes/pasos después usando los endpoints anidados.
- Si incluyes ingredientes sin especificar `order`, se asigna automáticamente según el índice del array (0, 1, 2...).
- Los pasos se numeran automáticamente (`stepNumber`) según el orden del array (1, 2, 3...).
- **Transacción atómica**: Si falla la creación de algún ingrediente o paso, se revierte toda la operación (la receta no se crea).
- Para crear solo la receta base sin ingredientes ni pasos, simplemente omite esos campos.

---

### GET /recipes

Lista todas las recetas del usuario autenticado.

**Autenticación**: Requerida

**Response** (200 OK):
```json
[
  {
    "id": 1,
    "userId": 123,
    "title": "Pasta Carbonara",
    "description": "Deliciosa pasta italiana",
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

Obtiene una receta específica por su ID, **incluyendo todos sus ingredientes y pasos**.

**Autenticación**: Requerida

**Autorización**: Solo puedes ver tus propias recetas

**Path Parameters**:
- `id`: ID numérico de la receta

**Response** (200 OK):
```json
{
  "id": 1,
  "userId": 123,
  "title": "Pasta Carbonara",
  "description": "Deliciosa pasta italiana",
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
      "notes": "Preferiblemente spaghetti",
      "order": 0
    },
    {
      "id": 2,
      "recipeId": 1,
      "ingredientName": "Huevos",
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
      "instruction": "Hervir agua con sal",
      "duration": 5
    },
    {
      "id": 2,
      "recipeId": 1,
      "stepNumber": 2,
      "instruction": "Cocinar la pasta",
      "duration": 10
    }
  ]
}
```

**Nota**: Este endpoint siempre devuelve los ingredientes y pasos incluidos, ordenados por `order` y `stepNumber` respectivamente.

**Errores**:
- 404: Receta no encontrada
- 403: No tienes acceso a esta receta

---

### PATCH /recipes/:id

Actualiza una receta existente.

**Autenticación**: Requerida

**Autorización**: Solo puedes actualizar tus propias recetas

**Path Parameters**:
- `id`: ID numérico de la receta

**Request Body** (todos los campos son opcionales):
```json
{
  "title": "string",
  "description": "string",
  "servings": "number (mínimo 1)",
  "prepTime": "number (mínimo 0)",
  "cookTime": "number (mínimo 0)",
  "imageUrl": "string"
}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "userId": 123,
  "title": "Pasta Carbonara Mejorada",
  "description": "Deliciosa pasta italiana con toque especial",
  "servings": 6,
  "prepTime": 15,
  "cookTime": 25,
  "imageUrl": "https://example.com/pasta-new.jpg",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

**Errores**:
- 404: Receta no encontrada
- 403: No tienes acceso a esta receta

---

### DELETE /recipes/:id

Elimina una receta.

**Autenticación**: Requerida

**Autorización**: Solo puedes eliminar tus propias recetas

**Path Parameters**:
- `id`: ID numérico de la receta

**Response** (204 No Content): Sin contenido

**Errores**:
- 404: Receta no encontrada
- 403: No tienes acceso a esta receta

**Nota**: Esta operación elimina la receta y todos sus ingredientes y pasos en cascada.

---

## Ingredientes de Recetas

### POST /recipes/:recipeId/ingredients

Añade un ingrediente a una receta.

**Autenticación**: Requerida

**Autorización**: Solo puedes añadir ingredientes a tus propias recetas

**Path Parameters**:
- `recipeId`: ID de la receta

**Request Body**:
```json
{
  "ingredientName": "string (requerido, máximo 100 caracteres)",
  "quantity": "number (requerido, mínimo 0.01)",
  "unit": "GRAM | KILOGRAM | MILLILITER | LITER | TEASPOON | TABLESPOON | CUP | UNIT | PINCH | TO_TASTE (requerido)",
  "notes": "string (opcional, máximo 500 caracteres)",
  "order": "number (opcional, mínimo 0, default: 0)"
}
```

**Ejemplo de Unidades**:
- `GRAM`: Gramos
- `KILOGRAM`: Kilogramos
- `MILLILITER`: Mililitros
- `LITER`: Litros
- `TEASPOON`: Cucharadita
- `TABLESPOON`: Cucharada
- `CUP`: Taza
- `UNIT`: Unidad (para contar items individuales)
- `PINCH`: Pizca
- `TO_TASTE`: Al gusto

**Response** (200 OK):
```json
{
  "id": 1,
  "recipeId": 1,
  "ingredientName": "Pasta",
  "quantity": 400,
  "unit": "GRAM",
  "notes": "Preferiblemente spaghetti",
  "order": 0
}
```

**Errores**:
- 404: Receta no encontrada
- 403: No tienes acceso a esta receta

---

### PATCH /recipes/:recipeId/ingredients/:ingredientId

Actualiza un ingrediente de una receta.

**Autenticación**: Requerida

**Autorización**: Solo puedes actualizar ingredientes de tus propias recetas

**Path Parameters**:
- `recipeId`: ID de la receta
- `ingredientId`: ID del ingrediente

**Request Body** (todos los campos son opcionales):
```json
{
  "ingredientName": "string (máximo 100 caracteres)",
  "quantity": "number (mínimo 0.01)",
  "unit": "GRAM | KILOGRAM | MILLILITER | LITER | TEASPOON | TABLESPOON | CUP | UNIT | PINCH | TO_TASTE",
  "notes": "string (máximo 500 caracteres)",
  "order": "number (mínimo 0)"
}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "recipeId": 1,
  "ingredientName": "Pasta de trigo integral",
  "quantity": 500,
  "unit": "GRAM",
  "notes": "Preferiblemente spaghetti integral",
  "order": 0
}
```

**Errores**:
- 404: Receta o ingrediente no encontrado
- 403: No tienes acceso a esta receta

---

### DELETE /recipes/:recipeId/ingredients/:ingredientId

Elimina un ingrediente de una receta.

**Autenticación**: Requerida

**Autorización**: Solo puedes eliminar ingredientes de tus propias recetas

**Path Parameters**:
- `recipeId`: ID de la receta
- `ingredientId`: ID del ingrediente

**Response** (204 No Content): Sin contenido

**Errores**:
- 404: Receta o ingrediente no encontrado
- 403: No tienes acceso a esta receta

---

## Pasos de Recetas

### POST /recipes/:recipeId/steps

Añade un paso a una receta.

**Autenticación**: Requerida

**Autorización**: Solo puedes añadir pasos a tus propias recetas

**Path Parameters**:
- `recipeId`: ID de la receta

**Request Body**:
```json
{
  "instruction": "string (requerido, máximo 1000 caracteres)",
  "duration": "number (opcional, minutos, mínimo 0)"
}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "recipeId": 1,
  "stepNumber": 1,
  "instruction": "Hervir agua con sal en una olla grande",
  "duration": 5
}
```

**Nota**: El `stepNumber` se asigna automáticamente de forma secuencial.

**Errores**:
- 404: Receta no encontrada
- 403: No tienes acceso a esta receta

---

### PATCH /recipes/:recipeId/steps/:stepId

Actualiza un paso de una receta.

**Autenticación**: Requerida

**Autorización**: Solo puedes actualizar pasos de tus propias recetas

**Path Parameters**:
- `recipeId`: ID de la receta
- `stepId`: ID del paso

**Request Body** (todos los campos son opcionales):
```json
{
  "instruction": "string (máximo 1000 caracteres)",
  "duration": "number (minutos, mínimo 0)"
}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "recipeId": 1,
  "stepNumber": 1,
  "instruction": "Hervir abundante agua con sal en una olla grande",
  "duration": 10
}
```

**Errores**:
- 404: Receta o paso no encontrado
- 403: No tienes acceso a esta receta

---

### DELETE /recipes/:recipeId/steps/:stepId

Elimina un paso de una receta.

**Autenticación**: Requerida

**Autorización**: Solo puedes eliminar pasos de tus propias recetas

**Path Parameters**:
- `recipeId`: ID de la receta
- `stepId`: ID del paso

**Response** (204 No Content): Sin contenido

**Errores**:
- 404: Receta o paso no encontrado
- 403: No tienes acceso a esta receta

---

## Códigos de Estado HTTP

| Código | Significado | Cuándo se usa |
|--------|-------------|---------------|
| 200 | OK | Operación exitosa (GET, PATCH, POST sin crear recurso) |
| 201 | Created | Recurso creado exitosamente (POST) |
| 204 | No Content | Operación exitosa sin contenido de respuesta (DELETE) |
| 400 | Bad Request | Datos de entrada inválidos o faltantes |
| 401 | Unauthorized | No autenticado (token inválido o ausente) |
| 403 | Forbidden | Autenticado pero sin permisos para la operación |
| 404 | Not Found | Recurso no encontrado |
| 429 | Too Many Requests | Límite de rate limiting excedido (10 req/min) |
| 500 | Internal Server Error | Error del servidor |

---

## Manejo de Errores

Todos los errores siguen el formato estándar de NestJS:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### Errores de Validación

Cuando hay errores de validación, el mensaje incluye detalles específicos:

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

### Errores de Autenticación

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### Errores de Autorización

```json
{
  "statusCode": 403,
  "message": "You do not have access to this recipe"
}
```

### Errores de No Encontrado

```json
{
  "statusCode": 404,
  "message": "Recipe with ID 999 not found"
}
```

### Rate Limiting

Cuando se excede el límite de 10 peticiones por 60 segundos:

```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

---

## Flujo de Trabajo Recomendado

### Opción 1: Crear receta completa de una vez (Recomendado)

Usa esta opción cuando el usuario crea una receta nueva con todos los datos disponibles.

```javascript
const newRecipe = await api.createRecipe({
  title: "Pasta Carbonara",
  servings: 4,
  prepTime: 10,
  cookTime: 20,
  ingredients: [
    { ingredientName: "Pasta", quantity: 400, unit: "GRAM" },
    { ingredientName: "Huevos", quantity: 4, unit: "UNIT" },
    { ingredientName: "Queso parmesano", quantity: 100, unit: "GRAM" }
  ],
  steps: [
    { instruction: "Hervir agua con sal", duration: 5 },
    { instruction: "Cocinar pasta", duration: 10 },
    { instruction: "Mezclar con huevos y queso", duration: 3 }
  ]
});

// La respuesta incluye la receta completa con ingredientes y pasos creados
console.log(newRecipe.ingredients.length); // 3
console.log(newRecipe.steps.length); // 3
```

**Ventajas**:
- ✅ Una sola petición HTTP
- ✅ Transacción atómica (todo se crea o nada)
- ✅ Mejor experiencia de usuario
- ✅ Ingredientes y pasos numerados automáticamente

**Cómo funciona internamente**:
El backend usa una **transacción de base de datos**. Si falla la creación de cualquier ingrediente o paso, **toda la operación se cancela** (incluyendo la receta). Esto garantiza que nunca tendrás recetas incompletas en la base de datos.

---

### Opción 2: Crear receta vacía y añadir después

Usa esta opción cuando el usuario quiere guardar la receta primero y añadir detalles después.

```javascript
// 1. Crear receta base (sin ingredientes ni pasos)
const recipe = await api.createRecipe({
  title: "Pasta Carbonara",
  servings: 4
});

// 2. Más tarde, añadir ingredientes uno por uno
await api.addIngredient(recipe.id, {
  ingredientName: "Pasta",
  quantity: 400,
  unit: "GRAM"
});

await api.addIngredient(recipe.id, {
  ingredientName: "Huevos",
  quantity: 4,
  unit: "UNIT"
});

// 3. Añadir pasos uno por uno
await api.addStep(recipe.id, {
  instruction: "Hervir agua con sal",
  duration: 5
});
```

**Ventajas**:
- ✅ Flexibilidad para construir la receta gradualmente
- ✅ Útil para formularios multi-paso

**Desventajas**:
- ⚠️ Múltiples peticiones HTTP
- ⚠️ Receta puede quedar incompleta si el usuario no termina

---

### Opción 3: Editar receta existente

Usa los endpoints específicos para modificaciones puntuales.

```javascript
// Cambiar solo campos de la receta base
await api.updateRecipe(recipeId, {
  title: "Pasta Carbonara Mejorada",
  servings: 6,
  prepTime: 15
});

// Añadir un ingrediente nuevo
await api.addIngredient(recipeId, {
  ingredientName: "Bacon",
  quantity: 150,
  unit: "GRAM"
});

// Editar un ingrediente específico (sin afectar los demás)
await api.updateIngredient(recipeId, ingredientId, {
  quantity: 200  // Solo cambia la cantidad
});

// Eliminar un paso
await api.deleteStep(recipeId, stepId);

// Añadir un paso nuevo al final
await api.addStep(recipeId, {
  instruction: "Servir caliente con queso parmesano",
  duration: 1
});
```

**Ventajas**:
- ✅ Solo envías los datos que cambian
- ✅ Más eficiente para ediciones pequeñas
- ✅ Mejor para interfaces interactivas (editar ingrediente inline)

---

### Comparación de Estrategias

| Escenario | Estrategia Recomendada |
|-----------|------------------------|
| Usuario crea receta nueva con formulario completo | **Opción 1** - Una petición con todo |
| Usuario guarda receta y añade ingredientes después | **Opción 2** - Crear vacía, luego añadir |
| Usuario edita título de receta existente | **Opción 3** - PATCH /recipes/:id |
| Usuario añade un ingrediente a receta existente | **Opción 3** - POST /recipes/:id/ingredients |
| Usuario edita cantidad de un ingrediente | **Opción 3** - PATCH /recipes/:id/ingredients/:ingredientId |
| Usuario elimina un paso | **Opción 3** - DELETE /recipes/:id/steps/:stepId |

---

## Ejemplo de Cliente JavaScript

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

// Ejemplo de uso
const api = new ChefflowAPI();

// Ejemplo 1: Login y obtener recetas
try {
  const result = await api.login('johndoe', 'mypassword123');
  console.log('Login successful:', result);

  const recipes = await api.getRecipes();
  console.log('User recipes:', recipes);
} catch (error) {
  console.error('Error:', error.message);
}

// Ejemplo 2: Crear receta completa (transacción atómica)
try {
  const newRecipe = await api.createRecipe({
    title: "Pasta Carbonara",
    description: "Receta italiana clásica",
    servings: 4,
    prepTime: 10,
    cookTime: 15,
    ingredients: [
      { ingredientName: "Spaghetti", quantity: 400, unit: "GRAM" },
      { ingredientName: "Huevos", quantity: 4, unit: "UNIT" },
      { ingredientName: "Queso parmesano", quantity: 100, unit: "GRAM" },
      { ingredientName: "Panceta", quantity: 150, unit: "GRAM" }
    ],
    steps: [
      { instruction: "Hervir agua con sal en una olla grande", duration: 5 },
      { instruction: "Cocinar la pasta según las instrucciones", duration: 10 },
      { instruction: "Freír la panceta hasta que esté crujiente", duration: 5 },
      { instruction: "Batir los huevos con el queso rallado", duration: 2 },
      { instruction: "Mezclar todo y servir inmediatamente", duration: 3 }
    ]
  });

  console.log('Receta creada con éxito:', newRecipe);
  console.log(`Se crearon ${newRecipe.ingredients.length} ingredientes`);
  console.log(`Se crearon ${newRecipe.steps.length} pasos`);
} catch (error) {
  console.error('Error al crear receta:', error.message);
  // Si falla, NADA se creó (transacción atómica)
}

// Ejemplo 3: Editar ingrediente específico
try {
  await api.updateIngredient(recipeId, ingredientId, {
    quantity: 500,  // Cambiar cantidad de 400g a 500g
    notes: "Usar pasta de trigo integral"
  });
  console.log('Ingrediente actualizado');
} catch (error) {
  console.error('Error:', error.message);
}
```

---

## Configuración CORS

El API está configurado para aceptar peticiones desde los siguientes orígenes (configurables via `ALLOWED_ORIGINS`):

- `http://localhost:3000` (default)
- `http://localhost:5173` (Vite)
- `http://localhost:4200` (Angular)

**Métodos permitidos**: GET, POST, PUT, PATCH, DELETE, OPTIONS

**Headers permitidos**: Content-Type, Authorization

**Credentials**: Habilitado (necesario para cookies)

---

## Rate Limiting

La API implementa rate limiting para prevenir abuso:

- **Límite**: 10 peticiones por ventana de tiempo
- **Ventana**: 60 segundos (1 minuto)
- **Alcance**: Aplica a todos los endpoints (incluyendo públicos)

Cuando se excede el límite, recibirás un error 429 Too Many Requests.

**Configuración** (variables de entorno):
- `THROTTLE_TTL`: Duración de la ventana en milisegundos (default: 60000)
- `THROTTLE_LIMIT`: Número de peticiones permitidas (default: 10)

---

## Notas Importantes

1. **Hashing de Contraseñas**: Las contraseñas DEBEN hashearse en el cliente usando SHA-256 antes de enviarlas al servidor.

2. **Cookies HTTP-Only**: Las cookies de autenticación son HTTP-only y secure, por lo que no son accesibles desde JavaScript.

3. **Credentials**: SIEMPRE incluir `credentials: 'include'` en las peticiones fetch.

4. **Token Refresh**: El token de acceso expira en 15 minutos. Implementa un interceptor para refrescar automáticamente cuando recibas un 401.

5. **Validación**: Todos los datos se validan automáticamente. Los errores de validación incluyen detalles específicos.

6. **Transacciones Atómicas**: Al crear una receta con ingredientes y pasos, se usa una transacción de base de datos. Si falla cualquier parte (receta, ingrediente o paso), toda la operación se cancela automáticamente. Esto garantiza que nunca tendrás datos inconsistentes.

7. **Cascade Delete**: Al eliminar un usuario, se eliminan todas sus recetas. Al eliminar una receta, se eliminan todos sus ingredientes y pasos automáticamente.

8. **Propiedad**: Solo puedes acceder, modificar y eliminar tus propios recursos (recetas, ingredientes, pasos).

9. **Numeración Automática**:
   - Los ingredientes se ordenan automáticamente si no especificas `order` (0, 1, 2...).
   - Los pasos se numeran automáticamente con `stepNumber` (1, 2, 3...).

10. **GET /recipes/:id**: Siempre devuelve ingredientes y pasos incluidos. No necesitas hacer peticiones adicionales para obtenerlos.
