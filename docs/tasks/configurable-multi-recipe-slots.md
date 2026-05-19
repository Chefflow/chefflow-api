# Tarea: Slots configurables por usuario y multi-receta por slot

> **Modelos afectados**: `User`, `WeeklyPlanning`, `WeeklyPlanningSlot`
> **Modelo nuevo**: `WeeklyPlanningSlotRecipe` (tabla junction)
> **Tipo de migración**: mixta — aditiva en `User` y `WeeklyPlanning`, **transformacional** en `WeeklyPlanningSlot` (requiere data migration de `recipeId` actual a la junction antes de eliminar la columna)

---

## 1. Resumen

Dos cambios complementarios sobre la planificación semanal:

1. **Slots por día configurable por usuario**: actualmente está hardcodeado a 3 en `parse-slot-number.pipe.ts` y en frontend. Se sustituye por una preferencia del usuario (`slotsPerDay`) entre 1 y 6, con default 3. Cada `WeeklyPlanning` guarda un **snapshot** del valor en el momento de crearse, de manera que al cambiar la preferencia del usuario los plannings existentes no se ven afectados (sólo aplica a plannings nuevos).

2. **Multi-receta por slot**: actualmente la relación es 1:1 (`WeeklyPlanningSlot.recipeId`). Se cambia a 1:N mediante una tabla junction `WeeklyPlanningSlotRecipe`. Caso de uso: combinar "arroz blanco" + "curry" en un mismo slot sin tener que crear una receta específica para esa combinación. Máximo 5 recetas por slot. Sin duplicados dentro del mismo slot. Orden estable por `position` (asignado en el momento de añadir).

Ambos cambios son **independientes en la UI** pero comparten migración y módulo, por lo que se entregan juntos.

---

## 2. Reglas generales (obligatorias)

Estas reglas tienen prioridad sobre cualquier preferencia personal del implementador. Si entran en conflicto con consejos genéricos, gana lo que dice esta sección.

### 2.1 TypeScript
- **Prohibido `any`**. Usar `unknown` con narrowing si el tipo es desconocido.
- **Tipos de Prisma**: `import type { Prisma } from '@prisma/client'` cuando sean type-only.
- **Strict mode** activo. Respetar nullability.
- **Nullish coalescing** (`??`) en lugar de `||` cuando se quiere fallback solo en `null`/`undefined`.

### 2.2 Arquitectura del proyecto > best practices genéricas
- Respetar patrones del repo antes de aplicar consejos genéricos.
- **Patrones obligatorios**:
  - Entity classes con `Object.assign(this, partial)` en constructor.
  - Controladores devuelven `new EntityClass(data)`, nunca el objeto Prisma raw.
  - `@CurrentUser('id')` para extraer userId del JWT.
  - `JwtAuthGuard` global → no añadir `@UseGuards(JwtAuthGuard)`. Solo `@Public()` para públicos (no aplica aquí).
  - `ValidationPipe` global con `whitelist: true` y `forbidNonWhitelisted: true`.
  - `PrismaService` es `@Global` → inyectar directo, no importar `PrismaModule`.
  - Servicios reciben `tx?: Prisma.TransactionClient` opcional para componer en transacciones.

### 2.3 NestJS recomendado > inventar
- `ParseIntPipe` para `:id` numéricos.
- `PartialType` de `@nestjs/mapped-types` para `UpdateDto`.
- `NotFoundException`, `ForbiddenException`, `ConflictException`, `BadRequestException` — nunca `throw new Error()`.
- `Logger` de `@nestjs/common` con contexto. Cero `console.log`.
- `class-validator` decorators para validación. Cero validación manual en controllers.
- **HTTP codes**: `@HttpCode(HttpStatus.NO_CONTENT)` para `DELETE` exitoso sin body.

### 2.4 Seguridad y ownership
- **Toda query/mutación filtra por `userId`** del JWT. **NUNCA** confiar en `userId` que venga del body, path o query.
- En cada endpoint que opere sobre un `WeeklyPlanning` o `WeeklyPlanningSlot`, validar que pertenece al usuario autenticado. Si no → `NotFoundException` (no `ForbiddenException`, para no revelar existencia).
- Validar que la receta a asignar pertenece al mismo usuario dueño del planning. Si no → `NotFoundException`.

### 2.5 Migración de datos
- **Aditiva en `User`**: nueva columna `slotsPerDay` con `DEFAULT 3 NOT NULL`. Backfill automático por el default.
- **Aditiva en `WeeklyPlanning`**: nueva columna `slotsPerDay` con `DEFAULT 3 NOT NULL`. Backfill automático por el default (3 era el único valor posible antes).
- **Transformacional en `WeeklyPlanningSlot`**:
  1. `CREATE TABLE "WeeklyPlanningSlotRecipe"` (la junction).
  2. `INSERT INTO "WeeklyPlanningSlotRecipe" (slotId, recipeId, position, addedAt) SELECT id, recipeId, 1, createdAt FROM "WeeklyPlanningSlot"` — copia los datos actuales.
  3. `ALTER TABLE "WeeklyPlanningSlot" DROP CONSTRAINT` de la FK `recipeId`.
  4. `ALTER TABLE "WeeklyPlanningSlot" DROP COLUMN "recipeId"`.
- **Cero pérdida de datos**: cada asignación 1:1 actual se conserva como una fila en la junction con `position = 1`.
- La migración debe verificarse en un entorno con datos antes de aplicar a prod.

### 2.6 Tests
- **Cada service y controller necesita su `*.spec.ts`** con mocks de `PrismaService`.
- **Cobertura mínima**:
  - Happy path: crear planning toma snapshot de `User.slotsPerDay`.
  - Cambiar `User.slotsPerDay` no afecta plannings existentes (snapshot estable).
  - Añadir 1ª receta a slot vacío → crea fila slot + fila junction.
  - Añadir 2ª receta al mismo slot → no crea fila slot, añade junction con `position = 2`.
  - Añadir receta duplicada al mismo slot → 409 `RECIPE_DUPLICATE`.
  - Añadir 6ª receta al mismo slot → 400 `SLOT_FULL`.
  - Añadir receta con `slotNumber > planning.slotsPerDay` → 400 `SLOT_OUT_OF_RANGE`.
  - Añadir receta de otro usuario → 404.
  - Eliminar receta de slot con varias → mantiene fila slot, elimina solo la junction.
  - Eliminar última receta del slot → mantiene fila slot vacía (NO la borra).
  - Eliminar slot completo (`DELETE /slots/:day/:slot`) → cascade elimina todas las junctions.
  - Ownership: usuario A no puede tocar plannings/slots de usuario B (responde 404).
  - Validación `slotsPerDay` en update profile: 1-6, entero. Fuera de rango → 400.
- Patrón de mocks: ver `weekly-plannings.service.spec.ts` actual como referencia.

---

## 3. Decisiones de diseño cerradas (NO replantear)

| Decisión | Valor |
|---|---|
| Rango `slotsPerDay` | 1 a 6 (ambos inclusive) |
| Default `slotsPerDay` para usuarios existentes | 3 (vía `DEFAULT` en migración) |
| Default `slotsPerDay` para usuarios nuevos | 3 |
| Identidad semántica del slot | Posicional (slot 1, 2, 3…). Sin nombre. **No** se modela "Desayuno"/"Comida"/"Cena". |
| Política de cambio de `User.slotsPerDay` | Snapshot por planning. Plannings existentes mantienen su valor. Solo afecta plannings creados después del cambio. |
| Slots permitiendo multi-receta | **Todos** los slots admiten 1:N. Sin configuración por slot. |
| Tope de recetas por slot | 5 |
| Mínimo de recetas por slot | 0 (slot vacío es válido) |
| Duplicados dentro de un slot | **Prohibidos** — `UNIQUE(slotId, recipeId)` a nivel BD + validación en service. |
| Orden de recetas dentro de un slot | Por `position INT` ascendente. Asignado server-side: `max(position) + 1` al añadir. **No** se reordena manualmente (out of scope). |
| Eliminación de la última receta de un slot | El slot **se mantiene** (fila `WeeklyPlanningSlot` con 0 junctions). NO se borra. |
| Eliminación del slot completo | Endpoint `DELETE /slots/:day/:slot` → borra fila slot + cascade junctions. Diferente del flujo "eliminar última receta". |
| Validación de `slotNumber` | Mover validación del rango fuera del pipe estático. Pipe solo parsea `Int` ≥ 1. Validación contra `planning.slotsPerDay` en service. |
| Endpoint `PUT /slots/:day/:slot` (existente) | **Eliminar**. Reemplazado por `POST /slots/:day/:slot/recipes` (añadir) y `DELETE /slots/:day/:slot/recipes/:recipeId` (quitar una). |
| Concurrencia | Operaciones de añadir receta dentro de transacción Prisma con re-validación del tope dentro de la transacción. |

---

## 4. Criterios de aceptación

### Schema y migración
- [ ] `pnpm run prisma:generate` ejecuta sin errores tras los cambios de schema.
- [ ] `pnpm run prisma:migrate` genera migración con: `ALTER TABLE "User" ADD COLUMN "slotsPerDay"`, `ALTER TABLE "WeeklyPlanning" ADD COLUMN "slotsPerDay"`, `CREATE TABLE "WeeklyPlanningSlotRecipe"`, copia de datos, drop de FK + columna `recipeId` en `WeeklyPlanningSlot`.
- [ ] Datos existentes en `WeeklyPlanningSlot` se preservan: cada fila genera una entrada en la junction con `position = 1`, `recipeId` original, `addedAt = createdAt` original.
- [ ] Constraint `UNIQUE(slotId, recipeId)` activo en la junction.
- [ ] Constraint `UNIQUE(weeklyPlanningId, dayOfWeek, slotNumber)` se mantiene en `WeeklyPlanningSlot`.

### Endpoints `User`
- [ ] `PATCH /users/me` (o el endpoint existente equivalente) acepta `slotsPerDay?: number`.
- [ ] `slotsPerDay` fuera de rango (1-6) o no entero → 400 con mensaje claro.
- [ ] Cambiar `slotsPerDay` del usuario **no** modifica el campo `slotsPerDay` de plannings ya existentes (verificable: crear planning con valor 3, cambiar User a 5, releer planning → sigue 3).
- [ ] `GET /auth/me` (o el endpoint que devuelve el perfil) incluye `slotsPerDay` en la respuesta.

### Endpoints `WeeklyPlanning`
- [ ] `POST /weekly-plannings` copia `User.slotsPerDay` actual al campo `slotsPerDay` del planning recién creado.
- [ ] `GET /weekly-plannings/:id` devuelve:
  - `slotsPerDay` del planning.
  - `slots[].recipes: Recipe[]` (array, ordenado por `position` ASC).
  - **Ya no devuelve** `slots[].recipe` (singular).
- [ ] `GET /weekly-plannings` devuelve la lista incluyendo `slotsPerDay` por planning.
- [ ] `PATCH /weekly-plannings/:id` permite actualizar `weekStart` (sin cambios respecto a antes). NO permite actualizar `slotsPerDay` (es snapshot inmutable).
- [ ] `DELETE /weekly-plannings/:id` cascade elimina slots y junctions. Sin cambios respecto a antes.

### Endpoints de slots
- [ ] **`PUT /weekly-plannings/:id/slots/:day/:slot` se elimina del controller y del service.** Cualquier llamada responde 404 (Nest devuelve 404 para rutas no registradas).
- [ ] **Nuevo**: `POST /weekly-plannings/:id/slots/:day/:slot/recipes` con body `{ recipeId: number }`:
  - Si el slot no existe (no hay fila en `WeeklyPlanningSlot`), lo crea.
  - Si la receta ya está en el slot → 409 `RECIPE_DUPLICATE`.
  - Si el slot ya tiene 5 recetas → 400 `SLOT_FULL`.
  - Si `slotNumber > planning.slotsPerDay` → 400 `SLOT_OUT_OF_RANGE`.
  - Si la receta no existe o no pertenece al usuario → 404.
  - Si el planning no pertenece al usuario → 404.
  - Response 201: el slot completo actualizado con sus recetas, ordenadas por `position`.
- [ ] **Nuevo**: `DELETE /weekly-plannings/:id/slots/:day/:slot/recipes/:recipeId`:
  - Si la receta no estaba en el slot → 404.
  - Si el slot no existía → 404.
  - Tras eliminar, si quedan 0 recetas en el slot, la fila `WeeklyPlanningSlot` se **mantiene** (NO se borra).
  - Response 204 (sin body).
- [ ] **Mantener**: `DELETE /weekly-plannings/:id/slots/:day/:slot`:
  - Borra la fila `WeeklyPlanningSlot` (cascade elimina todas las junctions).
  - Response 204.

### Validación y seguridad
- [ ] Una llamada con `slotNumber = 4` sobre un planning con `slotsPerDay = 3` → 400 `SLOT_OUT_OF_RANGE`.
- [ ] Una llamada con `slotNumber = 0` o negativo → 400 (ParseSlotNumberPipe).
- [ ] Una llamada con `slotNumber = 7` (sobre el límite máximo del rango User) → 400 `SLOT_OUT_OF_RANGE` o validación previa según diseño del pipe — pero nunca debe llegar a la BD.
- [ ] Usuario A intenta añadir receta a planning del usuario B → 404.
- [ ] Usuario A intenta añadir receta del usuario B a su propio planning → 404.
- [ ] El error `RECIPE_DUPLICATE` y `SLOT_FULL` son detectables programáticamente (código + mensaje).

### Integridad
- [ ] `pnpm run test` pasa al 100% incluyendo los tests nuevos.
- [ ] `pnpm run test:e2e` pasa con los flows actualizados.
- [ ] `pnpm run lint` pasa sin warnings nuevos.
- [ ] `src/weekly-plannings/README.md` actualizado con los nuevos endpoints y el modelo.

---

## 5. Plan de implementación por fases

### Fase 1 — Schema Prisma y migración

**Archivo**: `prisma/schema.prisma`

**Cambios**:

1. Añadir campo `slotsPerDay` al modelo `User`:

```prisma
model User {
  // ... campos existentes
  slotsPerDay Int @default(3)
  // ... resto
}
```

2. Añadir campo `slotsPerDay` al modelo `WeeklyPlanning`:

```prisma
model WeeklyPlanning {
  id           Int      @id @default(autoincrement())
  userId       Int
  weekStart    DateTime @db.Date
  weekEnd      DateTime @db.Date
  slotsPerDay  Int      @default(3)  // ← nuevo, snapshot inmutable
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user  User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  slots WeeklyPlanningSlot[]

  @@unique([userId, weekStart])
  @@index([userId])
  @@index([weekStart])
}
```

3. Modificar `WeeklyPlanningSlot` (eliminar `recipeId`, añadir relación a junction):

```prisma
model WeeklyPlanningSlot {
  id                Int       @id @default(autoincrement())
  weeklyPlanningId  Int
  dayOfWeek         DayOfWeek
  slotNumber        Int
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  weeklyPlanning WeeklyPlanning              @relation(fields: [weeklyPlanningId], references: [id], onDelete: Cascade)
  recipes        WeeklyPlanningSlotRecipe[]  // ← nueva relación 1:N

  @@unique([weeklyPlanningId, dayOfWeek, slotNumber])
  @@index([weeklyPlanningId])
}
```

4. Crear modelo `WeeklyPlanningSlotRecipe` (junction):

```prisma
model WeeklyPlanningSlotRecipe {
  id        Int      @id @default(autoincrement())
  slotId    Int
  recipeId  Int
  position  Int
  addedAt   DateTime @default(now())

  slot   WeeklyPlanningSlot @relation(fields: [slotId], references: [id], onDelete: Cascade)
  recipe Recipe             @relation(fields: [recipeId], references: [id], onDelete: Cascade)

  @@unique([slotId, recipeId])
  @@index([slotId])
  @@index([recipeId])
}
```

5. Añadir relación inversa en `Recipe`:

```prisma
model Recipe {
  // ... campos existentes
  weeklyPlanningSlots WeeklyPlanningSlotRecipe[]  // ← reemplaza la relación directa anterior
  // ... resto
}
```

> **Importante sobre la migración generada por Prisma**: por defecto Prisma generará un `DROP COLUMN "recipeId"` que **destruiría datos**. La migración debe editarse manualmente para:
> 1. Crear la tabla junction primero.
> 2. Insertar los datos: `INSERT INTO "WeeklyPlanningSlotRecipe" ("slotId", "recipeId", "position", "addedAt") SELECT id, "recipeId", 1, "createdAt" FROM "WeeklyPlanningSlot";`
> 3. Eliminar la FK constraint sobre `WeeklyPlanningSlot.recipeId`.
> 4. Eliminar la columna `recipeId`.
>
> Recomendación: usar `prisma migrate dev --create-only` para generar el esqueleto y editar el SQL antes de aplicar.

**Comandos**:

```bash
pnpm run prisma:migrate -- --create-only --name add_slots_per_day_and_multi_recipe
# editar manualmente la migración para incluir el INSERT de copia
pnpm run prisma:migrate    # aplicar
pnpm run prisma:generate
```

**Verificación**:
- Inspeccionar SQL generado: debe contener `ADD COLUMN "slotsPerDay"` (×2), `CREATE TABLE "WeeklyPlanningSlotRecipe"`, `INSERT INTO ... SELECT`, drop de FK + drop de columna `recipeId`.
- Después de aplicar en un entorno con datos: `SELECT COUNT(*) FROM "WeeklyPlanningSlotRecipe"` debe coincidir con el número de filas que tenía `WeeklyPlanningSlot` antes (todas tenían `recipeId NOT NULL`).

---

### Fase 2 — Actualizar `UsersModule`

#### 2.1 DTO `UpdateUserDto`

Localización: `src/users/dto/update-user.dto.ts`.

Añadir campo `slotsPerDay` opcional con validación 1-6:

```typescript
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateUserDto {
  // ... campos existentes
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  slotsPerDay?: number;
}
```

#### 2.2 `UserEntity`

Localización: `src/users/entities/user.entity.ts`.

Exponer `slotsPerDay` en el entity (no marcar `@Exclude()`):

```typescript
export class UserEntity {
  id!: number;
  username!: string;
  email!: string;
  // ... campos existentes
  slotsPerDay!: number;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
```

#### 2.3 Service

`UsersService.update()` ya soporta el patrón con DTO partial → no requiere cambios funcionales más allá de aceptar el nuevo campo. Verificar.

#### 2.4 Tests

- Test que `PATCH /users/me` con `slotsPerDay = 5` lo persiste.
- Test con `slotsPerDay = 0` → 400.
- Test con `slotsPerDay = 7` → 400.
- Test con `slotsPerDay = "5"` (string) → 400 (gracias a `@IsInt()` + `transform`).

---

### Fase 3 — Actualizar `WeeklyPlanningsModule`

#### 3.1 Eliminar/relajar `ParseSlotNumberPipe`

Localización: `src/weekly-plannings/pipes/parse-slot-number.pipe.ts`.

Cambiar a parsear sólo `Int >= 1`. La validación de rango contra `planning.slotsPerDay` se mueve al service.

```typescript
@Injectable()
export class ParseSlotNumberPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const num = parseInt(value, 10);
    if (Number.isNaN(num) || num < 1) {
      throw new BadRequestException(`Invalid slot number: ${value}`);
    }
    return num;
  }
}
```

> Justificación: el pipe es stateless y no tiene acceso a la BD/usuario. Mover la validación dependiente del estado a la capa de servicio es más limpio que inyectar dependencias en el pipe (anti-patrón en NestJS).

#### 3.2 DTOs

**Eliminar** `src/weekly-plannings/dto/upsert-slot.dto.ts` (asociado al endpoint `PUT` que se elimina).

**Crear** `src/weekly-plannings/dto/add-recipe-to-slot.dto.ts`:

```typescript
import { IsInt, Min } from 'class-validator';

export class AddRecipeToSlotDto {
  @IsInt()
  @Min(1)
  recipeId!: number;
}
```

#### 3.3 Entity `WeeklyPlanningSlotEntity`

Localización: `src/weekly-plannings/entities/weekly-planning-slot.entity.ts`.

Cambios:
- Eliminar `recipeId` y `recipe` (singular).
- Añadir `recipes: RecipeEntity[]` (plural, ordenado).

```typescript
export class WeeklyPlanningSlotEntity {
  id!: number;
  weeklyPlanningId!: number;
  dayOfWeek!: DayOfWeek;
  slotNumber!: number;
  recipes!: RecipeEntity[];  // ordenado por position ASC
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<WeeklyPlanningSlotEntity>) {
    Object.assign(this, partial);
  }
}
```

#### 3.4 Entity `WeeklyPlanningEntity`

Añadir `slotsPerDay`:

```typescript
export class WeeklyPlanningEntity {
  id!: number;
  userId!: number;
  weekStart!: Date;
  weekEnd!: Date;
  slotsPerDay!: number;  // ← nuevo
  slots?: WeeklyPlanningSlotEntity[];
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<WeeklyPlanningEntity>) {
    Object.assign(this, partial);
  }
}
```

#### 3.5 Service `WeeklyPlanningsService`

##### `create()`

Al crear, leer `User.slotsPerDay` del usuario autenticado y copiarlo al planning:

```typescript
async create(userId: number, dto: CreateWeeklyPlanningDto): Promise<WeeklyPlanning> {
  const user = await this.prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { slotsPerDay: true },
  });

  return this.prisma.weeklyPlanning.create({
    data: {
      userId,
      weekStart: dto.weekStart,
      weekEnd: addDays(dto.weekStart, 6),
      slotsPerDay: user.slotsPerDay,
    },
  });
}
```

##### `findOne()` y `findAll()`

Incluir `slotsPerDay` en el select y, en `findOne`, incluir `slots.recipes` ordenadas por `position`:

```typescript
async findOne(userId: number, id: number) {
  const planning = await this.prisma.weeklyPlanning.findUnique({
    where: { id },
    include: {
      slots: {
        include: {
          recipes: {
            orderBy: { position: 'asc' },
            include: { recipe: true },
          },
        },
      },
    },
  });

  if (!planning || planning.userId !== userId) {
    throw new NotFoundException(`Weekly planning ${id} not found`);
  }

  // Aplanar la junction → array directo de recipes en cada slot
  return {
    ...planning,
    slots: planning.slots.map((s) => ({
      ...s,
      recipes: s.recipes.map((j) => j.recipe),
    })),
  };
}
```

##### `addRecipeToSlot()` (nuevo)

```typescript
async addRecipeToSlot(
  userId: number,
  planningId: number,
  day: DayOfWeek,
  slotNumber: number,
  recipeId: number,
) {
  return this.prisma.$transaction(async (tx) => {
    // 1. Validar planning + ownership
    const planning = await tx.weeklyPlanning.findUnique({
      where: { id: planningId },
      select: { id: true, userId: true, slotsPerDay: true },
    });
    if (!planning || planning.userId !== userId) {
      throw new NotFoundException(`Weekly planning ${planningId} not found`);
    }

    // 2. Validar slotNumber dentro de slotsPerDay
    if (slotNumber > planning.slotsPerDay) {
      throw new BadRequestException({
        code: 'SLOT_OUT_OF_RANGE',
        message: `Slot ${slotNumber} exceeds planning's slotsPerDay (${planning.slotsPerDay})`,
      });
    }

    // 3. Validar recipe + ownership
    const recipe = await tx.recipe.findUnique({
      where: { id: recipeId },
      select: { id: true, userId: true },
    });
    if (!recipe || recipe.userId !== userId) {
      throw new NotFoundException(`Recipe ${recipeId} not found`);
    }

    // 4. Upsert del slot (puede no existir aún)
    const slot = await tx.weeklyPlanningSlot.upsert({
      where: {
        weeklyPlanningId_dayOfWeek_slotNumber: {
          weeklyPlanningId: planningId,
          dayOfWeek: day,
          slotNumber,
        },
      },
      create: { weeklyPlanningId: planningId, dayOfWeek: day, slotNumber },
      update: {},
      include: { recipes: true },
    });

    // 5. Validar tope (re-leer dentro de transacción para evitar race)
    if (slot.recipes.length >= 5) {
      throw new BadRequestException({
        code: 'SLOT_FULL',
        message: `Slot already contains 5 recipes (max allowed)`,
      });
    }

    // 6. Validar duplicado
    if (slot.recipes.some((r) => r.recipeId === recipeId)) {
      throw new ConflictException({
        code: 'RECIPE_DUPLICATE',
        message: `Recipe ${recipeId} is already in this slot`,
      });
    }

    // 7. Calcular position
    const nextPosition = slot.recipes.length === 0
      ? 1
      : Math.max(...slot.recipes.map((r) => r.position)) + 1;

    // 8. Crear junction
    await tx.weeklyPlanningSlotRecipe.create({
      data: {
        slotId: slot.id,
        recipeId,
        position: nextPosition,
      },
    });

    // 9. Devolver slot actualizado con recipes ordenadas
    return tx.weeklyPlanningSlot.findUniqueOrThrow({
      where: { id: slot.id },
      include: {
        recipes: {
          orderBy: { position: 'asc' },
          include: { recipe: true },
        },
      },
    });
  });
}
```

##### `removeRecipeFromSlot()` (nuevo)

```typescript
async removeRecipeFromSlot(
  userId: number,
  planningId: number,
  day: DayOfWeek,
  slotNumber: number,
  recipeId: number,
): Promise<void> {
  return this.prisma.$transaction(async (tx) => {
    // Validar ownership del planning
    const planning = await tx.weeklyPlanning.findUnique({
      where: { id: planningId },
      select: { id: true, userId: true },
    });
    if (!planning || planning.userId !== userId) {
      throw new NotFoundException(`Weekly planning ${planningId} not found`);
    }

    // Buscar slot
    const slot = await tx.weeklyPlanningSlot.findUnique({
      where: {
        weeklyPlanningId_dayOfWeek_slotNumber: {
          weeklyPlanningId: planningId,
          dayOfWeek: day,
          slotNumber,
        },
      },
    });
    if (!slot) {
      throw new NotFoundException(`Slot not found`);
    }

    // Borrar junction (si existe)
    const result = await tx.weeklyPlanningSlotRecipe.deleteMany({
      where: { slotId: slot.id, recipeId },
    });
    if (result.count === 0) {
      throw new NotFoundException(`Recipe ${recipeId} not found in slot`);
    }

    // El slot se MANTIENE incluso si queda con 0 recetas.
    // No reordenamos las position restantes (los huecos son aceptables, position es solo para orden estable).
  });
}
```

##### `removeSlot()` (existente, mantener)

Sin cambios funcionales: borra la fila `WeeklyPlanningSlot`. El cascade de Prisma elimina las junctions automáticamente.

##### Eliminar `upsertSlot()` (antiguo `PUT`)

Eliminar el método y todas sus referencias.

#### 3.6 Controller `WeeklyPlanningsController`

Eliminar el método del `PUT /slots/:day/:slot`.

Añadir:

```typescript
@Post(':id/slots/:day/:slot/recipes')
async addRecipeToSlot(
  @CurrentUser('id') userId: number,
  @Param('id', ParseIntPipe) id: number,
  @Param('day', ParseDayOfWeekPipe) day: DayOfWeek,
  @Param('slot', ParseSlotNumberPipe) slot: number,
  @Body() dto: AddRecipeToSlotDto,
): Promise<WeeklyPlanningSlotEntity> {
  const result = await this.weeklyPlanningsService.addRecipeToSlot(
    userId, id, day, slot, dto.recipeId,
  );
  return new WeeklyPlanningSlotEntity({
    ...result,
    recipes: result.recipes.map((j) => new RecipeEntity(j.recipe)),
  });
}

@Delete(':id/slots/:day/:slot/recipes/:recipeId')
@HttpCode(HttpStatus.NO_CONTENT)
async removeRecipeFromSlot(
  @CurrentUser('id') userId: number,
  @Param('id', ParseIntPipe) id: number,
  @Param('day', ParseDayOfWeekPipe) day: DayOfWeek,
  @Param('slot', ParseSlotNumberPipe) slot: number,
  @Param('recipeId', ParseIntPipe) recipeId: number,
): Promise<void> {
  await this.weeklyPlanningsService.removeRecipeFromSlot(userId, id, day, slot, recipeId);
}
```

Mantener el `DELETE /slots/:day/:slot` existente sin cambios (borra todo el slot).

---

### Fase 4 — Tests

Crear/actualizar:
- `src/users/users.service.spec.ts` — añadir tests de `slotsPerDay`.
- `src/users/users.controller.spec.ts` — validación 400 fuera de rango.
- `src/weekly-plannings/weekly-plannings.service.spec.ts` — todos los nuevos métodos.
- `src/weekly-plannings/weekly-plannings.controller.spec.ts` — nuevas rutas.
- `test/weekly-plannings.e2e-spec.ts` — flujo completo:
  1. Login.
  2. PATCH `slotsPerDay = 5`.
  3. POST planning → verificar `slotsPerDay = 5` en respuesta.
  4. PATCH `slotsPerDay = 3` → re-GET planning → sigue 5.
  5. POST receta a slot → 201 con slot completo.
  6. POST misma receta al mismo slot → 409.
  7. POST a slot 6 sobre planning con `slotsPerDay = 5` → 400 `SLOT_OUT_OF_RANGE`.
  8. POST 5 recetas distintas, 6ª → 400 `SLOT_FULL`.
  9. DELETE una receta concreta → 204, slot persiste con N-1.
  10. DELETE última receta → 204, slot persiste vacío.
  11. DELETE slot completo → 204, slot desaparece.

---

### Fase 5 — Documentación

Actualizar:
- `src/weekly-plannings/README.md`: nueva tabla de endpoints, nuevo modelo de datos, ejemplos de payload.
- `docs/API_REFERENCE.md`: si existe entrada de planning slots, actualizar.
- `docs/ERROR_RESPONSES.md`: añadir códigos `SLOT_OUT_OF_RANGE`, `SLOT_FULL`, `RECIPE_DUPLICATE`.

---

## 6. Edge cases (lista exhaustiva)

| # | Caso | Comportamiento esperado |
|---|------|-------------------------|
| 1 | Reducir `User.slotsPerDay` con plannings activos que tienen slot > nuevo límite | Plannings existentes mantienen su `slotsPerDay` snapshot. No se borran datos. La UI los seguirá mostrando porque la fuente de verdad para "cuántos slots renderizar" es `planning.slotsPerDay`, no `user.slotsPerDay`. |
| 2 | Aumentar `User.slotsPerDay` | Plannings existentes no se actualizan. Solo plannings nuevos toman el valor mayor. |
| 3 | Crear planning para semana sin planning previo, después de cambiar `slotsPerDay` | El nuevo planning toma el `slotsPerDay` actual del User. |
| 4 | Editar planning de semana pasada | Permitido. El service valida `slotNumber` contra el `planning.slotsPerDay` propio (no el del User actual). |
| 5 | Receta duplicada en mismo slot | 409 `RECIPE_DUPLICATE`. UNIQUE constraint a nivel BD como red de seguridad. |
| 6 | Receta de otro usuario | 404 (no `403`, para no revelar existencia). |
| 7 | `slotNumber > planning.slotsPerDay` | 400 `SLOT_OUT_OF_RANGE`. |
| 8 | `slotNumber = 0` o negativo | 400 (en `ParseSlotNumberPipe`). |
| 9 | Eliminar receta no presente en slot | 404. |
| 10 | Eliminar receta de slot inexistente | 404. |
| 11 | Concurrencia: dos requests añaden la misma receta al mismo slot | UNIQUE(slotId, recipeId) lo previene a nivel BD. Service captura y devuelve 409. |
| 12 | Concurrencia: dos requests añaden a slot ya con 4 recetas (sería 6) | Transacción + re-lectura del slot dentro de la tx. Una de las dos fallará con 400 `SLOT_FULL`. |
| 13 | Eliminar receta del catálogo (Recipe) que está en un slot | Cascade elimina la junction (`onDelete: Cascade` en FK). El slot se mantiene con N-1 recetas. |
| 14 | Eliminar User | Cascade elimina plannings, slots, junctions. Sin cambios. |
| 15 | `position` con huecos tras eliminar (1, 2, 4) | Aceptable. `position` es solo para orden estable, no se reordena. La UI ordena por `position ASC` y eso basta. |
| 16 | Slot con 0 recetas tras eliminar la última | El slot **se mantiene** (fila `WeeklyPlanningSlot` persiste). Esto difiere del comportamiento previo (donde el slot se eliminaba al perder su receta). Es la decisión explícita del producto. |

---

## 7. Out of scope (NO implementar en esta tarea)

- Reordenar recetas dentro de un slot (drag & drop o flechas).
- Nombrar slots semánticamente ("Desayuno", "Comida", "Cena").
- Permitir que cada usuario marque qué slots admiten 1:N y cuáles no (todos admiten 1:N).
- Notas o comentarios por slot.
- Notas o cantidad por receta dentro de un slot (ej. "media ración de arroz").
- Compartir plannings entre usuarios.
- Shopping list en backend (sigue siendo derivada en frontend a partir de las recetas).
- Migrar plannings retroactivamente al cambiar `User.slotsPerDay` (snapshot estable es decisión cerrada).

---

## 8. Preguntas abiertas para el implementador

Si surgen dudas durante la implementación que no se resuelvan con este documento o los `.claude/rules/`, anotarlas aquí y consultarlas antes de cerrarlas:

1. ¿El endpoint `PATCH /users/me` actualmente existe o hay que crearlo? Verificar `users.controller.ts`. Si solo existe `PATCH /users/:id` con validación de ownership, evaluar si se mantiene esa convención o se añade `me`.
2. ¿La policy de `onDelete` en `WeeklyPlanningSlotRecipe.recipe` debe ser `Cascade` (la receta se borra del slot al borrar la receta) o `Restrict` (no se puede borrar una receta usada en un slot)? Decisión propuesta: `Cascade` — el usuario que borra una receta acepta perder los planes que la usaban. **Confirmar con el implementador frontend** si esto rompe alguna UX (probable que no, porque el frontend ya re-fetchea al volver a la pestaña).
3. ¿La migración debe correrse en producción con un script de respaldo antes? Decisión: sí, hacer dump de `WeeklyPlanningSlot` antes de aplicar.
