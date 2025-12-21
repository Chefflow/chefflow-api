---
paths: src/**/*.ts
---

# NestJS Development Patterns

## Service Layer Rules

- **Ownership Validation**: Always validate user ownership in service methods before returning or modifying resources
- **Error Handling**:
  - Use `NotFoundException` when resource doesn't exist
  - Use `ForbiddenException` when user lacks access
  - Use `BadRequestException` for invalid input
- **Data Access**: Never expose sensitive fields (passwordHash, hashedRefreshToken, etc.)
- **Prisma Integration**: PrismaService is @Global - inject directly without importing PrismaModule

## Controller Rules

- **Authentication**: Endpoints are protected by default via global JwtAuthGuard
  - Use `@Public()` decorator to bypass authentication
  - Use `@CurrentUser()` to extract full user object
  - Use `@CurrentUser('id')` to extract specific user fields
- **Response Serialization**: Always return Entity classes (e.g., `new UserEntity(user)`, `new RecipeEntity(recipe)`)
- **Validation**: Trust the global ValidationPipe - DTOs are automatically validated and transformed
- **HTTP Codes**: Use appropriate decorators (`@HttpCode(HttpStatus.NO_CONTENT)` for deletes)

## Module Organization

- Keep modules focused on single responsibility
- Export services that other modules need
- Don't import PrismaModule (it's global)
- Register strategies and guards in the module where they're defined

## DTOs and Validation

- Use class-validator decorators for all input validation
- Separate DTOs for different operations (CreateDto, UpdateDto)
- Use `@IsOptional()` for optional fields
- Leverage `PartialType` from `@nestjs/mapped-types` for update DTOs
- DTO validation happens automatically - no need to call validate()

## Entity Pattern

- Create Entity classes for all Prisma models exposed via API
- Use `@Exclude()` decorator to hide sensitive fields
- Entity transformation happens automatically via ClassSerializerInterceptor
- Always instantiate: `return new EntityClass(data)` from controllers
