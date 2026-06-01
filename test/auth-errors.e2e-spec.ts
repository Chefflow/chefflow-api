import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthErrorResponse } from '../src/common/exceptions/auth.exception';

describe('Auth Error Handling (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply global validation pipe (same as main.ts)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    prisma = app.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.user.deleteMany();
  });

  describe('POST /auth/register', () => {
    it('should return USERNAME_TAKEN error with suggestions', async () => {
      const existingUser = {
        username: 'testuser',
        email: 'existing@example.com',
        password:
          'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
        name: 'Test User',
      };

      // Create existing user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(existingUser);

      // Try to register with same username
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'testuser',
          email: 'new@example.com',
          password:
            'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
          name: 'New User',
        });

      expect(response.status).toBe(409);

      const error: AuthErrorResponse = response.body;
      expect(error).toMatchObject({
        code: 'USERNAME_TAKEN',
        message: 'Username is already taken',
        field: 'username',
      });
      expect(error.suggestions).toBeDefined();
      expect(Array.isArray(error.suggestions)).toBe(true);
      expect(error.suggestions!.length).toBeGreaterThan(0);
    });

    it('should return EMAIL_EXISTS error with suggestions', async () => {
      const existingUser = {
        username: 'testuser',
        email: 'existing@example.com',
        password:
          'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
        name: 'Test User',
      };

      // Create existing user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(existingUser);

      // Try to register with same email
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'newuser',
          email: 'existing@example.com',
          password:
            'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
          name: 'New User',
        });

      expect(response.status).toBe(409);

      const error: AuthErrorResponse = response.body;
      expect(error).toMatchObject({
        code: 'EMAIL_EXISTS',
        message: 'Email is already registered',
        field: 'email',
      });
      expect(error.suggestions).toBeDefined();
      expect(error.suggestions).toContain('Try logging in instead');
    });

    it('should return VALIDATION_ERROR for invalid input', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'ab', // Too short (min 3)
          email: 'invalid-email',
          password: 'short',
          name: 'Test',
        });

      expect(response.status).toBe(400);

      const error: AuthErrorResponse = response.body;
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBeDefined();
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      await request(app.getHttpServer()).post('/auth/register').send({
        username: 'testuser',
        email: 'test@example.com',
        password:
          'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
        name: 'Test User',
      });
    });

    it('should return INVALID_CREDENTIALS for wrong password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'testuser',
          password:
            'b665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', // Wrong password
        });

      expect(response.status).toBe(401);

      const error: AuthErrorResponse = response.body;
      expect(error).toMatchObject({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password',
      });
      expect(error.suggestions).toBeDefined();
      expect(error.suggestions).toContain('Check your username and password');
    });

    it('should return INVALID_CREDENTIALS for non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'nonexistent',
          password:
            'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
        });

      expect(response.status).toBe(401);

      const error: AuthErrorResponse = response.body;
      expect(error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('Rate Limiting', () => {
    it('should return RATE_LIMIT error after exceeding limit', async () => {
      // Make multiple sequential requests to trigger rate limit (default: 10 per 60s)
      let rateLimitResponse;

      for (let i = 0; i < 11; i++) {
        rateLimitResponse = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            username: 'test',
            password:
              'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
          });

        if (rateLimitResponse.status === 429) {
          break;
        }
      }

      expect(rateLimitResponse.status).toBe(429);

      const error: AuthErrorResponse = rateLimitResponse.body;
      expect(error).toMatchObject({
        code: 'RATE_LIMIT',
        message: 'Too many requests. Please try again later',
      });
      expect(error.retryAfter).toBeDefined();
      expect(typeof error.retryAfter).toBe('number');
      expect(error.suggestions).toBeDefined();
    }, 15000); // Increase timeout for this test
  });
});
