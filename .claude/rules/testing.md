---
paths: '**/*.spec.ts'
---

# Testing Best Practices

## Unit Testing Patterns

### Service Tests
- **Mock Dependencies**: Always mock PrismaService, JwtService, ConfigService
- **Test Isolation**: Each test should be independent
- **Descriptive Names**: Use "should..." pattern (e.g., "should create user with valid data")
- **Edge Cases**: Test error conditions, null values, missing data

### Controller Tests
- **Mock Services**: Mock the service layer completely
- **Test DTOs**: Verify request/response transformation
- **Test Guards**: Mock guard behavior, don't test guard logic here
- **Test Decorators**: Verify @CurrentUser, @Public work correctly

### Strategy Tests
- **Mock External Services**: Mock OAuth providers, JWT validation
- **Test Validation Logic**: Verify user lookup, token validation
- **Test Error Handling**: Verify UnauthorizedException thrown appropriately

## E2E Testing Patterns

### Setup
- Located in `/test/*.e2e-spec.ts`
- Use `supertest` for HTTP assertions
- Test complete flows, not individual endpoints

### Common Flows to Test
- Authentication: register → login → access protected route
- OAuth: Google login → callback → token refresh
- Token refresh: login → wait → refresh → access protected route
- CRUD operations: create → read → update → delete

### E2E Best Practices
- Clean database state between tests
- Test with realistic data
- Verify both success and failure cases
- Test cookie handling (httpOnly, secure, sameSite)

## Running Tests

```bash
# All unit tests
pnpm run test

# Specific test file
pnpm run test -- users.service.spec.ts

# Specific test name pattern
pnpm run test -- --testNamePattern="should validate ownership"

# Watch mode
pnpm run test:watch

# Coverage report
pnpm run test:cov

# E2E tests
pnpm run test:e2e

# Specific E2E test
pnpm run test:e2e -- auth-oauth.e2e-spec.ts
```

## Test Structure

### AAA Pattern (Arrange, Act, Assert)
```typescript
it('should create recipe for authenticated user', async () => {
  // Arrange
  const userId = 1;
  const createDto = { title: 'Test Recipe', servings: 4 };
  const mockRecipe = { id: 1, userId, ...createDto };
  prismaService.recipe.create.mockResolvedValue(mockRecipe);

  // Act
  const result = await service.create(userId, createDto);

  // Assert
  expect(result).toEqual(mockRecipe);
  expect(prismaService.recipe.create).toHaveBeenCalledWith({
    data: { userId, ...createDto }
  });
});
```

## Coverage Expectations

- **Target**: Aim for 80%+ code coverage
- **Critical Paths**: 100% coverage for authentication, authorization, payment flows
- **Unit Tests**: 175+ tests currently - maintain or increase
- **E2E Tests**: Cover all main user flows

## Mock Patterns

### PrismaService Mock
```typescript
const mockPrismaService = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  recipe: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};
```

### JwtService Mock
```typescript
const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-token'),
  verify: jest.fn().mockReturnValue({ username: 'testuser' }),
};
```

## Continuous Integration

- All tests must pass before merging
- Run linter before tests: `pnpm run lint`
- Verify build succeeds: `pnpm run build`
- E2E tests require PostgreSQL running
