---
paths: src/**/*.ts
---

# TypeScript Best Practices

## Type Safety

- **Strict Mode**: TypeScript strict mode is enabled - no implicit any
- **Explicit Types**: Prefer explicit return types on public methods
- **Prisma Types**: Import types from `@prisma/client` (User, Recipe, AuthProvider, etc.)
- **Avoid Any**: Never use `any` - use `unknown` if type is truly unknown, but try to use the especific type

## Decorators

- **Reflection Required**: `reflect-metadata` imported in main.ts
- **Decorator Order Matters**:
  - Method decorators first (@Get, @Post)
  - Parameter decorators after (@Body, @CurrentUser)
- **Custom Decorators**: Located in module-specific decorators/ folders

## Interfaces vs Types

- **Interfaces**: Use for object shapes that might be extended
- **Types**: Use for unions, intersections, and utilities
- **Prisma Models**: Always import as types: `import { User } from '@prisma/client'`

## Async/Await

- **Consistent Usage**: Use async/await throughout, avoid mixing with .then()
- **Error Handling**: Let NestJS exception filters handle errors (don't catch unless necessary)
- **Promise Returns**: Controllers return Promises - NestJS awaits them automatically

## Enums

- **Prisma Enums**: Import from @prisma/client (AuthProvider, Unit)
- **Custom Enums**: Define in separate files if shared across modules
- **String Enums**: Prefer string enums over numeric for clarity

## Dependency Injection

- **Constructor Injection**: Always use constructor-based DI
- **Private Readonly**: Mark injected dependencies as `private readonly`
- **Type Inference**: Let TypeScript infer types from decorators

```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly jwt: JwtService,
) {}
```

## Import Organization

- **Standard Library**: Node built-ins first
- **Third-Party**: NestJS, then other packages
- **Local Imports**: Project files last
- **Type Imports**: Use `import type` for type-only imports

```typescript
import type { Request, Response } from 'express';
```

## Null Safety

- **Optional Chaining**: Use `?.` for potentially null/undefined access
- **Nullish Coalescing**: Use `??` for default values (not `||`)
- **Prisma Nulls**: Respect Prisma's optional fields (passwordHash?, providerId?)

## Type Utilities

- **Partial**: Use `PartialType` from @nestjs/mapped-types for update DTOs
- **Pick/Omit**: Use for creating focused types from larger ones
- **Required/NonNullable**: Use to make optional fields required when needed

## Generic Types

- **Service Methods**: Use generics for reusable service methods
- **Type Parameters**: Name clearly (T for single generic, descriptive for multiple)
- **Constraints**: Use `extends` to constrain generic types

## Configuration

- **tsconfig.json**: Configured for NestJS + Prisma compatibility
- **Path Aliases**: Not used - prefer relative imports for clarity
- **Decorator Metadata**: emitDecoratorMetadata enabled for NestJS
- **ES Target**: ES2021 for modern JavaScript features
