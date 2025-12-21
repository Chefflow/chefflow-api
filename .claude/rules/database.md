---
paths:
  - src/**/*.ts
  - prisma/**/*
---

# Database & Prisma Best Practices

## Prisma Configuration

- **Prisma 7**: Uses `prisma.config.ts` for configuration (not environment variables in schema.prisma)
- **Connection**: PrismaService handles connection lifecycle automatically
- **After Schema Changes**: Always run `pnpm run prisma:generate` before tests or starting app

## Migration Workflow

1. Modify `prisma/schema.prisma`
2. Run `pnpm run prisma:generate` (regenerates Prisma Client types)
3. Run `pnpm run prisma:migrate` (creates and applies migration)
4. Commit both schema.prisma and migration files

## Model Design Patterns

### Primary Keys
- Use auto-increment integer `id` as primary key
- User model uses `id` (not username) as primary key

### Relationships
- **One-to-Many**: User → Recipe (userId foreign key)
- **Cascade Deletes**: Recipes, ingredients, and steps cascade when user deleted
- **Ordering**: Use `@default()` for created/updated timestamps

### Indexes
- Index foreign keys for performance (userId, recipeId)
- Index fields used in WHERE clauses (provider+providerId, ingredientName)
- Index timestamp fields for sorting (createdAt)

### Constraints
- **Unique**: username, email on User model
- **Composite Unique**: recipeId + stepNumber on RecipeStep
- **Required vs Optional**: Use `?` for nullable fields

## Query Patterns

### User Ownership Queries
```typescript
// Always filter by userId for user-owned resources
const recipes = await prisma.recipe.findMany({
  where: { userId },
  orderBy: { createdAt: 'desc' }
});
```

### Including Relations
```typescript
// Use include for nested data
const recipe = await prisma.recipe.findUnique({
  where: { id },
  include: {
    ingredients: { orderBy: { order: 'asc' } },
    steps: { orderBy: { stepNumber: 'asc' } }
  }
});
```

### Transaction Safety
- Use `prisma.$transaction()` for operations that must succeed/fail together
- Prisma handles connection pooling automatically

## Enums

- **AuthProvider**: LOCAL, GOOGLE, APPLE, GITHUB
- **Unit**: GRAM, KILOGRAM, MILLILITER, LITER, TEASPOON, TABLESPOON, CUP, UNIT, PINCH, TO_TASTE
- Import from `@prisma/client` - never hardcode strings

## Performance

- **Select Only Needed Fields**: Use `select` to reduce data transfer
- **Pagination**: Use `skip` and `take` for large result sets
- **Indexing**: Review slow query logs and add indexes as needed
- **Connection Pooling**: Configured in DATABASE_URL, managed by Prisma

## Testing with Prisma

- Mock PrismaService in unit tests - don't hit real database
- E2E tests should use test database instance
- Clean up test data between test runs
