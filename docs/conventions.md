# Project Conventions — chefflow-api

> Stack-specific patterns that **override** generic NestJS / TypeScript advice.
> Spec Author and Implementer MUST read this before drafting / coding.
> Reviewer cites this file in reject feedback.

Adapted equivalent of the harness skill's "Custom Framework Integration" section — this is a **NestJS API**, not React, so this file documents NestJS/Prisma-specific patterns we already follow in the codebase.

---

## 1. Module layout

Every feature lives in its own folder under `src/&lt;feature&gt;/` with this shape (mirroring `recipes/`, `weekly-plannings/`, etc.):

```
src/&lt;feature&gt;/
├── &lt;feature&gt;.module.ts
├── &lt;feature&gt;.controller.ts
├── &lt;feature&gt;.service.ts
├── dto/
│   ├── create-&lt;feature&gt;.dto.ts
│   └── update-&lt;feature&gt;.dto.ts        # PartialType(CreateDto)
└── entities/
    └── &lt;feature&gt;.entity.ts
```

Nested resources (e.g. ingredients of a recipe) live in their own sibling module (`src/recipe-ingredients/`) with controller path `/recipes/:recipeId/ingredients`. Do not nest folders inside `src/recipes/`.

## 2. Authentication patterns

- Global `JwtAuthGuard` is applied via `APP_GUARD` → **every route is protected by default**.
- Use `@Public()` (`src/auth/decorators/public.decorator.ts`) to opt-out.
- Extract the caller:
  ```ts
  @Get()
  list(@CurrentUser('id') userId: number) { … }
  ```
- **Never** read `userId` from request body or query params. The Reviewer auto-rejects this.

## 3. Ownership enforcement (service layer)

Standard pattern for user-owned resources:

```ts
async findOne(userId: number, id: number) {
  const record = await this.prisma.recipe.findUnique({ where: { id } });
  if (!record) throw new NotFoundException(`Recipe ${id} not found`);
  if (record.userId !== userId) throw new ForbiddenException();
  return record;
}
```

For sensitive resources where leakage matters, return `404` instead of `403` (decision in `design.md`).

## 4. DTOs &amp; validation

- All DTOs use class-validator decorators (`@IsString`, `@IsInt`, `@Min`, `@IsEnum`, etc.).
- Global `ValidationPipe` is configured with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true` → unknown fields throw, types are coerced.
- For partial updates: `export class UpdateXDto extends PartialType(CreateXDto) {}`.

## 5. Response serialization (Entity pattern)

- Never return raw Prisma objects from controllers — they leak `passwordHash`, `hashedRefreshToken`, etc.
- Each module exposes an `Entity` class that wraps Prisma output and uses `@Exclude()` on sensitive fields.
- Controllers return `new XEntity(record)`. The global `ClassSerializerInterceptor` handles the rest.

## 6. Prisma usage

- `PrismaService` is `@Global` → inject directly; do **not** re-import `PrismaModule`.
- Type-only imports: `import type { Prisma } from '@prisma/client'`.
- After editing `prisma/schema.prisma`: `pnpm run prisma:generate && pnpm run prisma:migrate`.
- Prefer aditive migrations. Transformacional/destructiva require explicit approval in `design.md` and a backfill strategy.
- Indexes are mandatory on FKs that are queried (`@@index([userId])`, `@@index([recipeId])`).

## 7. Error handling

- Throw NestJS HTTP exceptions from services — controllers stay thin.
- Do **not** `try/catch` Prisma calls just to rethrow — let the global filter handle it unless you map to a specific HTTP code.
- Custom enums and string literals: use `@IsEnum(MyEnum)` not regex.

## 8. Testing

- **Unit tests** (`*.spec.ts` next to source): mock `PrismaService`, `JwtService`, `ConfigService`. Cover service business rules, especially ownership and validation branches.
- **E2E tests** (`test/*.e2e-spec.ts`): hit a real Postgres (via `pnpm run test:db:up`) — do **not** mock the DB at this level. The whole stack runs.
- Run `pnpm run test:e2e` end-to-end before declaring a feature done.
- Test file naming: `&lt;feature&gt;.e2e-spec.ts`, matching one feature per file when feasible.

## 9. Cookies &amp; security (auth flows only)

- Set via `setAuthCookies()` helper — never inline `res.cookie(...)` elsewhere.
- `accessToken`: 15 m, path `/`, httpOnly.
- `Refresh`: 7 d, path `/auth/refresh`, httpOnly.
- `secure` and `sameSite` toggle by `NODE_ENV` (see `CLAUDE.md`).

## 10. Anti-patterns the Reviewer rejects

- `any` in production code (use `unknown` + narrowing).
- Magic numbers for slot counts, limits, etc. — extract a named constant.
- Returning Prisma objects directly from a controller.
- Reading `userId` from the request body.
- Mocking the DB in an e2e test.
- Adding `@Public()` to a route without a justification comment.
- Catching and reformatting exceptions inside controllers.
- Adding TODO/FIXME without an associated REQ or task in `specs/`.
