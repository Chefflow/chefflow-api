# Tasks — &lt;feature-id&gt;

> Atomic checklist for the **Implementer**. Each item ≤ 1h of work and independently verifiable.
> Order matters: do not reorder unless `design.md` is updated first.

---

## Pre-flight
- [ ] `./init.sh` returns success (harness ACTIVE)
- [ ] `requirements.md` and `design.md` are marked `spec_ready` in `features.json`

## Database
- [ ] Edit `prisma/schema.prisma` per design §2
- [ ] `pnpm run prisma:migrate -- --name &lt;migration_name&gt;`
- [ ] `pnpm run prisma:generate`
- [ ] Verify `pnpm run test` still green

## Module scaffolding
- [ ] Create `src/&lt;feat&gt;/&lt;feat&gt;.module.ts`
- [ ] Register module in `src/app.module.ts`

## DTOs &amp; Entities
- [ ] `src/&lt;feat&gt;/dto/create-&lt;feat&gt;.dto.ts` with class-validator decorators
- [ ] `src/&lt;feat&gt;/dto/update-&lt;feat&gt;.dto.ts` (`PartialType`)
- [ ] `src/&lt;feat&gt;/entities/&lt;feat&gt;.entity.ts` with `@Exclude()` on sensitive fields

## Service (business logic)
- [ ] Implement methods: create, findAll(userId), findOne(userId, id), update, remove
- [ ] Ownership check: `Forbidden` when `record.userId !== userId`
- [ ] Unit test: `src/&lt;feat&gt;/&lt;feat&gt;.service.spec.ts` — mock PrismaService

## Controller
- [ ] Endpoints per design §4
- [ ] `@CurrentUser('id')` instead of trusting body
- [ ] `ParseIntPipe` on `:id` params
- [ ] Return Entity (`new XEntity(data)`)

## Tests (1:1 with REQs)
- [ ] Unit test per REQ that lives in service
- [ ] E2E test: `test/&lt;feat&gt;.e2e-spec.ts`
- [ ] All REQs from `requirements.md §5` have at least one mapped test

## Verification (Reviewer/Tester gate)
- [ ] `pnpm run lint` clean
- [ ] `pnpm run test` green (full suite, not just new tests)
- [ ] `pnpm run test:e2e` green
- [ ] `pnpm run build` succeeds
- [ ] Manually exercise the happy path against a running `start:dev` (or document why not possible)

## Done
- [ ] Update `features.json`: `status: "done"`, `mergedAt`, `mergedIn` (commit SHA)
- [ ] Append summary to `progress/history.md`
