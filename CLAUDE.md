# CLAUDE.md

Guidance for Claude Code working in this repo. Detailed conventions live in `.claude/rules/` and `docs/conventions.md`; the SDD harness lives in `init.sh`, `features.json`, `specs/`, `progress/`, and `.claude/agents/`. Full backup at `CLAUDE.md.bak`.

## Harness (read first)

1. Run `./init.sh` before any task. Non-zero exit → halt and report.
2. Pick work from `features.json`. Roles are defined in `.claude/agents/`:
   - `leader` orchestrates state transitions
   - `spec-author` writes `specs/&lt;id&gt;/{requirements,design,tasks}.md`
   - `implementer` codes from approved specs only
   - `reviewer` validates with veto power
3. Append every state transition to `progress/history.md`.
4. If context > 20%, summarise into `progress/history.md` and ask user to `/clear`.

## Stack

NestJS 11 · TypeScript 5.9+ · Prisma 7 / PostgreSQL 16 · pnpm 10 · Node 24+.
JWT + Google OAuth2, refresh tokens in httpOnly cookies. Global `JwtAuthGuard` and `ThrottlerGuard`.

## Essential commands

```bash
pnpm run start:dev               # dev on :4000 (hot-reload)
pnpm run test                    # unit
pnpm run test:e2e                # e2e (auto starts postgres-test)
pnpm run lint                    # eslint --fix
pnpm run build                   # tsc → dist/
pnpm run prisma:generate         # after schema.prisma edits
pnpm run prisma:migrate          # create + apply migration
```

Docker: `docker:build | up | down | logs | restart`.

## Non-negotiable rules

- Routes are **protected by default**. Add `@Public()` only with justification.
- Extract caller with `@CurrentUser('id')`. **Never** trust `userId` from body/query.
- Services validate ownership: `Forbidden` (or `NotFound` if leakage matters) before mutating.
- Return Entity classes (`new XEntity(data)`), never raw Prisma objects.
- DTOs use class-validator; the global `ValidationPipe` is `whitelist + forbidNonWhitelisted + transform`.
- `PrismaService` is `@Global` — inject directly.
- Migrations are aditive unless `design.md` approves transformacional/destructiva.
- No `any` in production code. `import type { Prisma } from '@prisma/client'` for types.
- Mock the DB in unit tests, **not** in e2e tests.

Full pattern docs: `.claude/rules/{api-design,nestjs-patterns,security,typescript,database,testing}.md` and `docs/conventions.md`.

## Module map

`auth/` · `users/` · `recipes/` · `recipe-ingredients/` · `recipe-steps/` · `weekly-plannings/` · `prisma/` (global) · `common/` (middleware) · `types/`.
Nested resources expose their own module with a nested route (`/recipes/:recipeId/ingredients`).

## Database notes

- User PK: auto-increment `id`. Unique on `username`, `email`. `provider` enum (`LOCAL|GOOGLE|APPLE|GITHUB`).
- Cascade delete: deleting a User → recipes → ingredients/steps.
- `RecipeIngredient.unit` enum: `GRAM, KILOGRAM, MILLILITER, LITER, TEASPOON, TABLESPOON, CUP, UNIT, PINCH, TO_TASTE`.
- `RecipeStep` unique on `(recipeId, stepNumber)`.
- Prisma 7 uses `prisma.config.ts` at repo root (not env in `schema.prisma`).

## Env

Required: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FRONTEND_URL`, `ALLOWED_ORIGINS`.
Optional: `PORT` (4000 dev), `NODE_ENV`, `THROTTLE_TTL`, `THROTTLE_LIMIT`, `JWT_EXPIRES_IN`.

## Health

`GET /health` (liveness) · `GET /ready` (readiness incl. DB).

## Common gotchas

- "Prisma Client does not match schema" → `pnpm run prisma:generate`.
- E2E DB unreachable → `pnpm run test:db:up`.
- Cookies in dev: `secure=false`, `sameSite='none'`; frontend MUST send `credentials: 'include'`.
- OAuth redirect mismatch → check `GOOGLE_CALLBACK_URL` and `FRONTEND_URL`.
