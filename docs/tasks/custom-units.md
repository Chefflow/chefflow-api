# Tarea: Unidades de medida personalizadas por usuario

> **Módulo nuevo**: `CustomUnitsModule`
> **Modelo nuevo**: `CustomUnit`
> **Modelo afectado**: `RecipeIngredient`
> **Tipo de migración**: aditiva (sin pérdida ni transformación de datos existentes)

---

## 1. Resumen

Permitir que cada usuario defina **unidades de medida personalizadas** (ej: "chorrito", "puñado") manteniendo intactas las del sistema (`Unit` enum). Las unidades personalizadas:

- Son **por usuario** (no globales).
- Son **editables** y los cambios se propagan automáticamente a todas las recetas del usuario que las usen (vía FK).
- Son **reusables** entre recetas del mismo usuario.
- Se **deduplican automáticamente** al importar recetas compartidas: si una receta importada usa "chorrito" y el usuario receptor ya tiene "chorrito" → se reusa el ID existente, **NO se crea duplicado**.

Las unidades del sistema (`Unit` enum) **NO se tocan, NO se editan, NO se borran**. Siguen siendo el catálogo base.

---

## 2. Reglas generales (obligatorias)

Estas reglas tienen prioridad sobre cualquier preferencia personal del implementador. Si entran en conflicto con consejos genéricos, gana lo que dice esta sección.

### 2.1 TypeScript
- **Prohibido `any`**. Si el tipo es realmente desconocido, usar `unknown` y hacer narrowing. Si TypeScript no infiere, declarar el tipo explícito.
- **Tipos de Prisma**: importar siempre desde `@prisma/client` con `import type` cuando sean type-only (ej: `import type { Prisma } from '@prisma/client'`).
- **Strict mode** está activo. Respetar nullability de campos opcionales (`?`).
- **Nullish coalescing** (`??`) en lugar de `||` cuando se quiere fallback solo en `null`/`undefined`.

### 2.2 Arquitectura del proyecto > best practices genéricas
- **Respeta los patrones existentes** del repo antes de aplicar consejos genéricos de NestJS o de internet. Si chocan, gana el patrón del repo.
- **Patrones a respetar obligatoriamente**:
  - Entity classes con `Object.assign(this, partial)` en constructor (ver `RecipeIngredientEntity`).
  - Controladores siempre devuelven `new EntityClass(data)`, nunca el objeto Prisma raw.
  - `@CurrentUser('id')` para extraer el `userId` del JWT.
  - `JwtAuthGuard` es global → no añadir `@UseGuards(JwtAuthGuard)` en endpoints protegidos. Solo `@Public()` para públicos (no aplica aquí).
  - `ValidationPipe` es global con `whitelist: true` y `forbidNonWhitelisted: true` → confiar, no revalidar manualmente en controllers.
  - `PrismaService` es `@Global` → inyectar directamente, NO importar `PrismaModule`.
  - Servicios reciben `tx?: Prisma.TransactionClient` opcional para componer en transacciones (ver `RecipeIngredientsService.add` como referencia).

### 2.3 NestJS recomendado > inventar
- Usar lo que NestJS ya ofrece **antes** de crear utilidades propias:
  - `ParseIntPipe` para `:id` numéricos en params.
  - `PartialType` de `@nestjs/mapped-types` para `UpdateDto`.
  - `NotFoundException`, `ForbiddenException`, `ConflictException`, `BadRequestException` — nunca `throw new Error()`.
  - `Logger` de `@nestjs/common` con contexto. Cero `console.log`.
  - `class-validator` decorators para validación. Cero validación manual en controllers.
- **HTTP codes**: usar `@HttpCode(HttpStatus.NO_CONTENT)` para `DELETE` exitoso (sin body).

### 2.4 Seguridad y ownership
- **Toda query/mutación filtra por `userId`** obtenido del JWT. **NUNCA** confiar en un `userId` que venga del body, del path o del query string para autorización.
- En cada endpoint que opere sobre una `CustomUnit`, validar que `customUnit.userId === currentUserId`. Si no coincide → `NotFoundException` (no `ForbiddenException`, para no revelar existencia).
- Las unidades del sistema (`Unit` enum) son **inmutables**. No existe endpoint para editarlas/borrarlas.

### 2.5 Migración de datos
- **Aditiva únicamente**. Solo añadir tablas nuevas y columnas nullable nuevas.
- **Las filas existentes de `RecipeIngredient` deben seguir siendo válidas sin backfill.** Cero scripts de migración de datos.
- `unit` pasa a opcional en el modelo, pero las filas actuales ya tienen valor → no se tocan.

### 2.6 Tests
- **Cada service y controller necesita su `*.spec.ts`** con mocks de `PrismaService`.
- **Cobertura mínima**:
  - Happy path (crear, leer, actualizar, borrar).
  - Ownership: usuario A no puede tocar unidades de usuario B (responde 404).
  - Conflicto de nombre duplicado al crear (responde 409).
  - Borrado en uso sin `force` ni `reassignTo` (responde 409 con lista de recetas).
  - Borrado en uso con `force=true` (cascada).
  - Borrado en uso con `reassignTo` (reasignación).
- Patrón de mocks: ver `recipe-ingredients.service.spec.ts` y `weekly-plannings.service.spec.ts` como referencia.

---

## 3. Decisiones de diseño cerradas (NO replantear)

| Decisión | Valor |
|---|---|
| Tipo de almacenamiento | Tabla `CustomUnit` separada (no string libre, no reemplazo del enum) |
| Alcance | Por usuario (`userId` FK) |
| Unicidad | `[userId, nameNormalized]` |
| `nameNormalized` | `name.trim().toLowerCase()` — calculado en el service, NO confiar en que el cliente lo envíe |
| Unidad por ingrediente | XOR entre `unit` (enum) y `customUnitId` — exactamente uno debe estar set |
| Edición de unidades del sistema | **No permitida** — no existe endpoint |
| Edición de custom unit | PATCH simple → propagación automática vía FK |
| Borrado de custom unit no usada | DELETE directo, 204 |
| Borrado de custom unit en uso | 409 con lista de recetas + opciones `?force=true` o `?reassignTo=<id\|enumValue>` |
| Import de receta compartida | Payload trae `customUnit: { name, abbreviation? }` por nombre, **NO por ID**. Service hace `upsert` por `[userId, nameNormalized]`. **Si ya existe, se reusa; nunca se duplica.** |

---

## 4. Criterios de aceptación

- [ ] `pnpm run prisma:generate` ejecuta sin errores tras los cambios de schema.
- [ ] `pnpm run prisma:migrate` genera migración aditiva (solo `CREATE TABLE` y `ALTER TABLE ... ADD COLUMN` nullable).
- [ ] Datos existentes en `RecipeIngredient` siguen presentes y consultables tras la migración (verificar manualmente con `prisma studio` o un `findMany`).
- [ ] `GET /custom-units` lista solo las unidades del usuario autenticado.
- [ ] `POST /custom-units` con nombre duplicado (case-insensitive) responde 409.
- [ ] `PATCH /custom-units/:id` cambia el nombre y todas las recetas que lo usan reflejan el cambio sin queries adicionales.
- [ ] `DELETE /custom-units/:id` cuando NO está en uso → 204.
- [ ] `DELETE /custom-units/:id` cuando SÍ está en uso (sin flags) → 409 con `{ message, affectedRecipes: [{ id, title }] }`.
- [ ] `DELETE /custom-units/:id?force=true` → borra unidad y los `RecipeIngredient` que la usan (cascada).
- [ ] `DELETE /custom-units/:id?reassignTo=42` → reasigna los `RecipeIngredient` afectados a la unidad indicada antes de borrar.
- [ ] `POST /recipes/:id/ingredients` con `unit` y `customUnitId` ambos set → 400.
- [ ] `POST /recipes/:id/ingredients` con ninguno set → 400.
- [ ] `POST /recipes/:id/ingredients` con `customUnitId` que pertenece a OTRO usuario → 404.
- [ ] Helper `resolveCustomUnit(userId, { name, abbreviation })` existe en `CustomUnitsService` y hace upsert por `[userId, nameNormalized]`. Si la unidad ya existe → devuelve su ID sin crear duplicado.
- [ ] `pnpm run test` pasa al 100% incluyendo los tests nuevos.
- [ ] `pnpm run lint` pasa sin warnings nuevos.
- [ ] Documentación del módulo en `src/custom-units/README.md` siguiendo el formato de los otros módulos.

---

## 5. Plan de implementación por fases

### Fase 1 — Schema Prisma y migración

**Archivo**: `prisma/schema.prisma`

**Cambios**:

1. Añadir el nuevo modelo:

```prisma
model CustomUnit {
  id             Int     @id @default(autoincrement())
  userId         Int
  name           String  @db.VarChar(50)
  nameNormalized String  @db.VarChar(50)
  abbreviation   String? @db.VarChar(20)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user        User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  ingredients RecipeIngredient[]

  @@unique([userId, nameNormalized])
  @@index([userId])
}
```

2. Añadir relación inversa en `User`:

```prisma
model User {
  // ...campos existentes...
  customUnits CustomUnit[]
}
```

3. Modificar `RecipeIngredient`:
   - `unit Unit` → `unit Unit?` (opcional)
   - Añadir `customUnitId Int?`
   - Añadir relación a `CustomUnit`
   - Añadir índice `[customUnitId]`

```prisma
model RecipeIngredient {
  id             Int     @id @default(autoincrement())
  recipeId       Int
  ingredientName String
  quantity       Float
  unit           Unit?   // ← era requerido, ahora opcional
  customUnitId   Int?    // ← nuevo
  notes          String?
  order          Int     @default(0)

  recipe     Recipe      @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  customUnit CustomUnit? @relation(fields: [customUnitId], references: [id], onDelete: Restrict)

  @@index([recipeId])
  @@index([ingredientName])
  @@index([customUnitId])
}
```

> **Importante**: `onDelete: Restrict` en la relación `customUnit` es intencional — bloquea el borrado de una `CustomUnit` que esté en uso a nivel de DB. La gestión "elegante" del 409 + force/reassignTo se hace en el service, pero esto es la red de seguridad.

**Comandos**:

```bash
pnpm run prisma:generate
pnpm run prisma:migrate    # Nombre sugerido: "add_custom_units"
```

**Verificación**:
- Inspeccionar el SQL generado en `prisma/migrations/<timestamp>_add_custom_units/migration.sql`.
- Confirmar que **solo contiene** `CREATE TABLE "CustomUnit"`, `ALTER TABLE "RecipeIngredient" ADD COLUMN "customUnitId"`, `ALTER TABLE "RecipeIngredient" ALTER COLUMN "unit" DROP NOT NULL`, índices y FKs. Nada de `UPDATE` ni `DELETE`.

---

### Fase 2 — `CustomUnitsModule`

Estructura (espejo de `RecipesModule`/`WeeklyPlanningsModule`):

```
src/custom-units/
├── dto/
│   ├── create-custom-unit.dto.ts
│   ├── update-custom-unit.dto.ts
│   └── delete-custom-unit-query.dto.ts
├── entities/
│   └── custom-unit.entity.ts
├── custom-units.controller.ts
├── custom-units.service.ts
├── custom-units.module.ts
└── README.md
```

#### 2.1 `CreateCustomUnitDto`

```typescript
import { IsString, IsNotEmpty, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateCustomUnitDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  abbreviation?: string;
}
```

#### 2.2 `UpdateCustomUnitDto`

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateCustomUnitDto } from './create-custom-unit.dto';

export class UpdateCustomUnitDto extends PartialType(CreateCustomUnitDto) {}
```

#### 2.3 `DeleteCustomUnitQueryDto`

```typescript
import { IsBoolean, IsInt, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { Unit } from '@prisma/client';

export class DeleteCustomUnitQueryDto {
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  force?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  reassignTo?: number;

  @IsOptional()
  @IsEnum(Unit)
  reassignToEnum?: Unit;
}
```

> **Nota**: si se pasan `force` y `reassignTo` a la vez → 400. El service valida exclusividad mutua.

#### 2.4 `CustomUnitEntity`

```typescript
export class CustomUnitEntity {
  id!: number;
  userId!: number;
  name!: string;
  abbreviation?: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<CustomUnitEntity>) {
    Object.assign(this, partial);
  }
}
```

> **Observación**: `nameNormalized` NO se expone en la entity — es un detalle interno.

#### 2.5 `CustomUnitsService`

Métodos públicos requeridos (todos reciben `userId: number` como primer arg para ownership):

```typescript
class CustomUnitsService {
  // CRUD básico
  findAll(userId: number): Promise<CustomUnit[]>;
  findOne(userId: number, id: number): Promise<CustomUnit>;  // 404 si no existe o no es del user
  create(userId: number, dto: CreateCustomUnitDto): Promise<CustomUnit>;  // 409 si nombre duplicado
  update(userId: number, id: number, dto: UpdateCustomUnitDto): Promise<CustomUnit>;
  delete(userId: number, id: number, options: DeleteCustomUnitQueryDto): Promise<void>;

  // Helper para import de recetas compartidas (Fase 4)
  resolveCustomUnit(
    userId: number,
    payload: { name: string; abbreviation?: string },
    tx?: Prisma.TransactionClient,
  ): Promise<{ id: number }>;
}
```

**Reglas de implementación**:

- **`normalizeName`** (helper privado): `name.trim().toLowerCase()`. Aplicar SIEMPRE antes de leer/escribir `nameNormalized`. Cliente envía `name` tal cual lo escribió.
- **`create`**: detectar duplicado capturando `Prisma.PrismaClientKnownRequestError` con `code === 'P2002'` y lanzar `ConflictException` con mensaje claro (`Custom unit "chorrito" already exists`).
- **`update`**: si el dto trae `name`, recalcular `nameNormalized`. Misma protección 409 ante duplicado.
- **`delete`**:
  1. Validar que `force` y `reassignTo`/`reassignToEnum` no se pasen juntos → 400.
  2. `findOne` para validar ownership (lanza 404 si no es del user).
  3. Contar `RecipeIngredient` que usan esta unidad: `prisma.recipeIngredient.count({ where: { customUnitId: id } })`.
  4. Si `count === 0` → borrar y devolver.
  5. Si `count > 0` y NO hay `force` ni `reassignTo*` → lanzar `ConflictException` con payload:
     ```json
     {
       "message": "Custom unit is in use",
       "affectedRecipes": [{ "id": 12, "title": "Tortilla" }, ...]
     }
     ```
     Para obtener `affectedRecipes`: query a `recipe` con `where: { ingredients: { some: { customUnitId: id } } }`, seleccionando solo `{ id, title }`. Validar también que sean recetas del usuario (defensa en profundidad).
  6. Si `force === true` → usar `prisma.$transaction([...])` para borrar ingredientes afectados y luego la unidad. Avisar en `Logger`.
  7. Si `reassignTo` está set → validar que es una `CustomUnit` válida del MISMO `userId` → `update` masivo de los `RecipeIngredient` afectados → borrar la unidad. Todo en transacción.
  8. Si `reassignToEnum` está set → `update` masivo poniendo `unit = <enum>, customUnitId = null` → borrar la unidad. Todo en transacción.

- **`resolveCustomUnit`** (helper de import):
  ```typescript
  async resolveCustomUnit(userId, payload, tx) {
    const prisma = tx ?? this.prisma;
    const nameNormalized = this.normalizeName(payload.name);

    // Intentar encontrar primero — evita escrituras innecesarias
    const existing = await prisma.customUnit.findUnique({
      where: { userId_nameNormalized: { userId, nameNormalized } },
      select: { id: true },
    });
    if (existing) return existing;

    // No existe → crear
    return prisma.customUnit.create({
      data: {
        userId,
        name: payload.name.trim(),
        nameNormalized,
        abbreviation: payload.abbreviation?.trim(),
      },
      select: { id: true },
    });
  }
  ```
  > **No usar `upsert`** porque `update` es no-op aquí y queremos el bypass cuando ya existe (cumple el requisito explícito del usuario: "antes de crear se verifica que el usuario ya lo tenga, si lo tiene no se intenta crear").

#### 2.6 `CustomUnitsController`

```typescript
@Controller('custom-units')
export class CustomUnitsController {
  constructor(private readonly service: CustomUnitsService) {}

  @Get()
  async findAll(@CurrentUser('id') userId: number) {
    const units = await this.service.findAll(userId);
    return units.map((u) => new CustomUnitEntity(u));
  }

  @Get(':id')
  async findOne(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const unit = await this.service.findOne(userId, id);
    return new CustomUnitEntity(unit);
  }

  @Post()
  async create(
    @CurrentUser('id') userId: number,
    @Body() dto: CreateCustomUnitDto,
  ) {
    const unit = await this.service.create(userId, dto);
    return new CustomUnitEntity(unit);
  }

  @Patch(':id')
  async update(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCustomUnitDto,
  ) {
    const unit = await this.service.update(userId, id, dto);
    return new CustomUnitEntity(unit);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: DeleteCustomUnitQueryDto,
  ) {
    await this.service.delete(userId, id, query);
  }
}
```

#### 2.7 `CustomUnitsModule`

```typescript
@Module({
  controllers: [CustomUnitsController],
  providers: [CustomUnitsService],
  exports: [CustomUnitsService],  // Para que RecipeIngredients pueda usar resolveCustomUnit
})
export class CustomUnitsModule {}
```

#### 2.8 Registrar en `AppModule`

Añadir `CustomUnitsModule` a `imports` en `src/app.module.ts`.

---

### Fase 3 — Actualizar `RecipeIngredient`

#### 3.1 `CreateRecipeIngredientDto`

```typescript
import { IsString, IsNotEmpty, IsNumber, IsEnum, IsOptional, Min, MaxLength, IsInt, ValidateIf } from 'class-validator';
import { Unit } from '@prisma/client';

export class CreateRecipeIngredientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  ingredientName!: string;

  @IsNumber()
  @Min(0.01)
  quantity!: number;

  // XOR entre unit y customUnitId. Validación dura en service.
  @ValidateIf((o) => o.customUnitId === undefined || o.customUnitId === null)
  @IsEnum(Unit)
  unit?: Unit;

  @ValidateIf((o) => o.unit === undefined || o.unit === null)
  @IsInt()
  @Min(1)
  customUnitId?: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  order?: number;
}
```

> **Nota**: `class-validator` por sí solo no expresa XOR limpiamente. La validación a nivel DTO cubre el caso "ninguno set" (ambos `@ValidateIf` se activan y fallan). El caso "ambos set" se valida en el **service** lanzando `BadRequestException`. Documentar esto en el JSDoc.

#### 3.2 Service `RecipeIngredientsService.add` y `.update`

Antes de cualquier escritura:

```typescript
if (dto.unit && dto.customUnitId) {
  throw new BadRequestException('Provide either unit or customUnitId, not both');
}

if (dto.customUnitId) {
  const customUnit = await prisma.customUnit.findUnique({
    where: { id: dto.customUnitId },
    select: { userId: true },
  });
  if (!customUnit || customUnit.userId !== userId) {
    throw new NotFoundException(`Custom unit with ID ${dto.customUnitId} not found`);
  }
}
```

Aplicar la misma validación en `update` cuando el dto incluya cualquiera de los dos campos.

#### 3.3 `RecipeIngredientEntity`

```typescript
import { Unit } from '@prisma/client';
import { CustomUnitEntity } from '../../custom-units/entities/custom-unit.entity';

export class RecipeIngredientEntity {
  id!: number;
  recipeId!: number;
  ingredientName!: string;
  quantity!: number;
  unit?: Unit | null;
  customUnitId?: number | null;
  customUnit?: CustomUnitEntity | null;  // poblado cuando el caller hace include
  notes?: string | null;
  order!: number;

  constructor(partial: Partial<RecipeIngredientEntity>) {
    Object.assign(this, partial);
    if (partial.customUnit) {
      this.customUnit = new CustomUnitEntity(partial.customUnit);
    }
  }
}
```

#### 3.4 Includes en queries de `Recipe`

Donde sea que `recipes.service.ts` o similar haga `include: { ingredients: true }`, ampliar a:

```typescript
include: {
  ingredients: {
    include: { customUnit: true },
    orderBy: { order: 'asc' },
  },
}
```

Auditar todos los call-sites: `src/recipes/recipes.service.ts` y cualquier otro que devuelva ingredientes.

---

### Fase 4 — Helper de import (preparación para feature futura)

`resolveCustomUnit` ya queda implementado en Fase 2.5. Esta fase es **solo dejar el cableado listo**:

- Importar `CustomUnitsModule` en `RecipeIngredientsModule` y `RecipesModule` para poder inyectar `CustomUnitsService`.
- Inyectar `CustomUnitsService` en `RecipeIngredientsService` (constructor).
- **No implementar el endpoint `/recipes/import` todavía** — está fuera del alcance de esta tarea. Solo dejar el helper accesible.

> Cuando se implemente el flujo de import por URL (tarea futura), el código consumidor hará algo como:
> ```typescript
> const { id: customUnitId } = await this.customUnitsService.resolveCustomUnit(
>   userId,
>   { name: incoming.customUnit.name, abbreviation: incoming.customUnit.abbreviation },
>   tx,
> );
> ```

---

### Fase 5 — Tests

#### 5.1 `custom-units.service.spec.ts`

- `findAll`: filtra por `userId`.
- `findOne`: 404 cuando no existe.
- `findOne`: 404 cuando pertenece a otro usuario (sin distinguir de "no existe").
- `create`: crea con `nameNormalized` en lowercase.
- `create`: 409 ante duplicado (mockear `P2002`).
- `update`: recalcula `nameNormalized` si cambia el nombre.
- `update`: 409 ante duplicado.
- `delete`: 204 si no está en uso.
- `delete`: 409 con `affectedRecipes` si está en uso sin flags.
- `delete` con `force`: borra ingredientes afectados y la unidad en transacción.
- `delete` con `reassignTo` (custom): valida ownership de la unidad destino, reasigna y borra.
- `delete` con `reassignToEnum`: reasigna ingredientes a `unit = <enum>` y `customUnitId = null`.
- `delete` con `force` y `reassignTo` simultáneos: 400.
- `resolveCustomUnit`: si ya existe → devuelve ID existente, **no llama a `create`**.
- `resolveCustomUnit`: si no existe → llama a `create` con `nameNormalized` correcto.
- `resolveCustomUnit`: matching case-insensitive ("Chorrito" matchea con "chorrito" existente).

#### 5.2 `custom-units.controller.spec.ts`

- Cada endpoint llama al service con `userId` extraído de `@CurrentUser('id')`.
- Cada respuesta es instancia de `CustomUnitEntity` (no objeto raw).

#### 5.3 Actualizar `recipe-ingredients.service.spec.ts`

- Añadir test: 400 si `unit` y `customUnitId` se pasan ambos.
- Añadir test: 404 si `customUnitId` no pertenece al usuario.
- Añadir test: ingrediente creado solo con `customUnitId` (sin `unit`) → válido.

---

### Fase 6 — Documentación

Crear `src/custom-units/README.md` siguiendo el formato de los READMEs existentes en otros módulos (`src/recipes/README.md`, `src/weekly-plannings/README.md` como referencia). Debe incluir:

- Resumen del módulo y prefijo de ruta (`/custom-units`).
- Tabla de endpoints con método, path, descripción, status codes.
- Ejemplos de request/response en JSON para cada endpoint.
- Sección "Borrado en uso" explicando el flujo 409 → `force` / `reassignTo`.
- Sección "Integración con import de recetas" mencionando el helper `resolveCustomUnit` y que la deduplicación es automática.

Actualizar `docs/README.md` añadiendo la fila correspondiente en la tabla de Modules.

---

## 6. Notas finales para el implementador

- **No tocar** el enum `Unit` en `schema.prisma`. Sigue siendo el catálogo del sistema.
- **No crear** un endpoint para listar/editar/borrar valores del enum. Son inmutables por diseño.
- **No mezclar** esta tarea con el flujo de import de recetas — solo se prepara el helper.
- Si surge una decisión de diseño no cubierta aquí, **preguntar antes de inventar**. Las decisiones de la sección 3 son cerradas.
- Cuando dudes entre dos formas correctas, elige la que **se parece más al código existente del repo**. Consistencia > novedad.
