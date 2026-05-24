# Design — &lt;feature-id&gt;

> Technical blueprint. Lists **exact files** to create/modify and the patterns to follow.
> Updated by the Spec Author; consumed by the Implementer.

---

## 1. Architecture summary

&lt;Diagram, ASCII, or 2–4 sentences. How does this feature fit into existing modules?&gt;

## 2. Data model changes (Prisma)

```prisma
// prisma/schema.prisma — add/modify
model Example {
  id        Int     @id @default(autoincrement())
  userId    Int
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}
```

- **Migration name**: `&lt;YYYYMMDDHHMM&gt;_&lt;descriptive_name&gt;`
- **Migration type**: aditiva / transformacional / destructiva
- **Backfill needed?**: &lt;yes/no — describe strategy&gt;

## 3. Module / file map

| Action | Path | Purpose |
|--------|------|---------|
| ➕ new  | `src/&lt;feat&gt;/&lt;feat&gt;.module.ts` | NestJS module |
| ➕ new  | `src/&lt;feat&gt;/&lt;feat&gt;.controller.ts` | HTTP endpoints |
| ➕ new  | `src/&lt;feat&gt;/&lt;feat&gt;.service.ts` | Business logic |
| ➕ new  | `src/&lt;feat&gt;/dto/create-&lt;feat&gt;.dto.ts` | class-validator DTO |
| ➕ new  | `src/&lt;feat&gt;/entities/&lt;feat&gt;.entity.ts` | Response shape with `@Exclude()` |
| ✏️ edit | `src/app.module.ts` | Register new module |
| ➕ new  | `test/&lt;feat&gt;.e2e-spec.ts` | E2E coverage |

## 4. API contract

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST   | `/resource` | JWT | `CreateResourceDto` | `201` entity |
| GET    | `/resource/:id` | JWT (owner) | — | `200` entity / `403` / `404` |

## 5. Patterns to follow (project conventions)

Anchored in `.claude/rules/` and `docs/conventions.md`:

- DTOs validated by the **global ValidationPipe** (whitelist + transform).
- Routes are protected by default → only add `@Public()` if explicitly required.
- Use `@CurrentUser('id')` to extract `userId`; never trust `body.userId`.
- Throw `ForbiddenException` (not `NotFoundException`) when caller is authenticated but not the owner — unless leakage is a concern; in that case return 404.
- Return responses via Entity classes (`new XEntity(data)`); never raw Prisma objects.

## 6. Risks / open questions

- &lt;Risk + mitigation&gt;
- &lt;Open question for the user before implementation starts&gt;
