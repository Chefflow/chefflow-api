import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthService } from '../src/auth/auth.service';
import cookieParser from 'cookie-parser';

describe('Google OAuth (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let authService: AuthService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply the same configuration as main.ts
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    prismaService = app.get<PrismaService>(PrismaService);
    authService = app.get<AuthService>(AuthService);

    await app.init();
  });

  afterAll(async () => {
    await prismaService.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    // Clean up test users after each test
    await prismaService.user.deleteMany({
      where: {
        OR: [
          { email: { contains: 'oauth-test' } },
          { username: { contains: 'oauth_test' } },
          { providerId: { contains: 'test-provider-id' } },
        ],
      },
    });
  });

  describe('/auth/google (GET)', () => {
    it('should redirect to Google OAuth consent page', () => {
      return request(app.getHttpServer())
        .get('/auth/google')
        .expect(302)
        .expect((res) => {
          expect(res.headers.location).toContain(
            'https://accounts.google.com/o/oauth2',
          );
          expect(res.headers.location).toContain('response_type=code');
          expect(res.headers.location).toContain('scope=email%20profile');
        });
    });

    it('should include correct redirect_uri in OAuth URL', () => {
      return request(app.getHttpServer())
        .get('/auth/google')
        .expect(302)
        .expect((res) => {
          const location = res.headers.location as string;
          expect(location).toContain('redirect_uri=');
          expect(location).toContain(
            encodeURIComponent('/auth/google/callback'),
          );
        });
    });

    it('should include client_id in OAuth URL', () => {
      return request(app.getHttpServer())
        .get('/auth/google')
        .expect(302)
        .expect((res) => {
          const location = res.headers.location as string;
          expect(location).toContain('client_id=');
        });
    });
  });

  describe('/auth/google/callback (GET)', () => {
    it('should redirect when callback is called without code (OAuth flow)', () => {
      return request(app.getHttpServer())
        .get('/auth/google/callback')
        .expect(302); // OAuth guard redirects to Google instead of returning 401
    });

    it('should return error with invalid OAuth code', () => {
      return request(app.getHttpServer())
        .get('/auth/google/callback?code=invalid-code-123')
        .expect(500); // Invalid OAuth code results in server error from Google
    });

    it('should be protected by GoogleOAuthGuard and redirect', () => {
      return request(app.getHttpServer())
        .get('/auth/google/callback')
        .expect(302); // OAuth guard initiates redirect to Google
    });
  });

  describe('OAuth User Creation and Linking', () => {
    it('should create new user from OAuth data when user does not exist', async () => {
      const oauthUserData = {
        provider: 'GOOGLE' as const,
        providerId: 'test-provider-id-new-user',
        email: 'oauth-test-new@example.com',
        name: 'OAuth Test New User',
        image: 'https://example.com/photo.jpg',
      };

      // Directly test the AuthService's validateOAuthUser method
      const user = await authService.validateOAuthUser(oauthUserData);

      expect(user).toBeDefined();
      expect(user.email).toBe(oauthUserData.email);
      expect(user.provider).toBe('GOOGLE');
      expect(user.providerId).toBe(oauthUserData.providerId);
      expect(user.username).toMatch(/^oauth_test_new/);
      expect(user.passwordHash).toBeNull();

      // Verify user was actually created in database
      const dbUser = await prismaService.user.findUnique({
        where: { email: oauthUserData.email },
      });
      expect(dbUser).toBeDefined();
      expect(dbUser?.provider).toBe('GOOGLE');
    });

    it('should return existing user when OAuth provider and providerId match', async () => {
      // Create a user first
      const createdUser = await prismaService.user.create({
        data: {
          username: 'oauth_test_existing',
          email: 'oauth-test-existing@example.com',
          name: 'Existing OAuth User',
          provider: 'GOOGLE',
          providerId: 'test-provider-id-existing',
          passwordHash: null,
        },
      });

      const oauthUserData = {
        provider: 'GOOGLE' as const,
        providerId: 'test-provider-id-existing',
        email: 'oauth-test-existing@example.com',
        name: 'Existing OAuth User',
        image: undefined,
      };

      const user = await authService.validateOAuthUser(oauthUserData);

      expect(user).toBeDefined();
      expect(user.username).toBe(createdUser.username);
      expect(user.email).toBe(createdUser.email);
      expect(user.providerId).toBe(createdUser.providerId);
    });

    it('should link OAuth account to existing LOCAL user by email', async () => {
      // Create a LOCAL user first
      const localUser = await prismaService.user.create({
        data: {
          username: 'local_user_to_link',
          email: 'oauth-test-link@example.com',
          name: 'Local User',
          provider: 'LOCAL',
          passwordHash: 'hashed_password',
        },
      });

      const oauthUserData = {
        provider: 'GOOGLE' as const,
        providerId: 'test-provider-id-link',
        email: 'oauth-test-link@example.com',
        name: 'OAuth User',
        image: 'https://example.com/photo.jpg',
      };

      const user = await authService.validateOAuthUser(oauthUserData);

      expect(user).toBeDefined();
      expect(user.username).toBe(localUser.username);
      expect(user.email).toBe(localUser.email);
      expect(user.provider).toBe('GOOGLE');
      expect(user.providerId).toBe('test-provider-id-link');
      expect(user.image).toBe('https://example.com/photo.jpg');

      // Verify in database
      const dbUser = await prismaService.user.findUnique({
        where: { email: 'oauth-test-link@example.com' },
      });
      expect(dbUser).toBeDefined();
      expect(dbUser?.provider).toBe('GOOGLE');
      expect(dbUser?.providerId).toBe('test-provider-id-link');
    });

    it('should generate unique username when base username is taken', async () => {
      // Create a user with the base username
      await prismaService.user.create({
        data: {
          username: 'oauth_test_unique',
          email: 'other@example.com',
          name: 'Other User',
          provider: 'LOCAL',
          passwordHash: 'hashed_password',
        },
      });

      const oauthUserData = {
        provider: 'GOOGLE' as const,
        providerId: 'test-provider-id-unique',
        email: 'oauth-test-unique@example.com',
        name: 'OAuth Test Unique',
        image: undefined,
      };

      const user = await authService.validateOAuthUser(oauthUserData);

      expect(user).toBeDefined();
      expect(user.email).toBe(oauthUserData.email);
      expect(user.username).not.toBe('oauth_test_unique');
      expect(user.username).toMatch(/^oauth_test_unique\d+$/);
    });

    it('should sanitize email with special characters for username', async () => {
      const oauthUserData = {
        provider: 'GOOGLE' as const,
        providerId: 'test-provider-id-sanitize',
        email: 'test.user+tag@example.com',
        name: 'Test User',
        image: undefined,
      };

      const user = await authService.validateOAuthUser(oauthUserData);

      expect(user).toBeDefined();
      expect(user.username).toBe('test_user_tag');
      expect(user.email).toBe('test.user+tag@example.com');
    });

    it('should use email prefix as name when name is not provided', async () => {
      const oauthUserData = {
        provider: 'GOOGLE' as const,
        providerId: 'test-provider-id-no-name',
        email: 'oauth-test-noname@example.com',
        name: undefined,
        image: undefined,
      };

      const user = await authService.validateOAuthUser(oauthUserData);

      expect(user).toBeDefined();
      expect(user.name).toBe('oauth-test-noname'); // Uses email prefix with hyphen
      expect(user.username).toMatch(/^oauth_test_noname/);
    });
  });

  describe('OAuth Login Flow', () => {
    it('should generate JWT token for OAuth user', async () => {
      const oauthUser = await prismaService.user.create({
        data: {
          username: 'oauth_test_login',
          email: 'oauth-test-login@example.com',
          name: 'OAuth Login User',
          provider: 'GOOGLE',
          providerId: 'test-provider-id-login',
          passwordHash: null,
        },
      });

      const result = await authService.loginWithOAuth(oauthUser);

      expect(result).toHaveProperty('accessToken');
      expect(result.accessToken).toBeTruthy();
      expect(typeof result.accessToken).toBe('string');
      expect(result).toHaveProperty('user');
      expect(result.user.username).toBe('oauth_test_login');
      expect(result.user.email).toBe('oauth-test-login@example.com');
      // passwordHash exists but is null for OAuth users (excluded on serialization)
      expect(result.user.passwordHash).toBeNull();
    });

    it('should allow JWT token to access protected endpoints', async () => {
      const oauthUser = await prismaService.user.create({
        data: {
          username: 'oauth_test_protected',
          email: 'oauth-test-protected@example.com',
          name: 'OAuth Protected User',
          provider: 'GOOGLE',
          providerId: 'test-provider-id-protected',
          passwordHash: null,
        },
      });

      const { accessToken } = await authService.loginWithOAuth(oauthUser);

      // Test protected endpoint with OAuth-generated JWT
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.username).toBe('oauth_test_protected');
          expect(res.body.email).toBe('oauth-test-protected@example.com');
          expect(res.body.provider).toBe('GOOGLE');
          // passwordHash is null for OAuth users (excluded in serialization)
          expect(res.body.passwordHash).toBeNull();
        });
    });
  });

  describe('OAuth Security', () => {
    it('should not expose passwordHash in OAuth user response', async () => {
      const oauthUser = await prismaService.user.create({
        data: {
          username: 'oauth_test_security',
          email: 'oauth-test-security@example.com',
          name: 'OAuth Security User',
          provider: 'GOOGLE',
          providerId: 'test-provider-id-security',
          passwordHash: null,
        },
      });

      const result = await authService.loginWithOAuth(oauthUser);

      // passwordHash exists in UserEntity but will be excluded when serialized
      expect(result.user.passwordHash).toBeNull();
    });

    it('should set OAuth user passwordHash to null', async () => {
      const oauthUserData = {
        provider: 'GOOGLE' as const,
        providerId: 'test-provider-id-password-null',
        email: 'oauth-test-password-null@example.com',
        name: 'OAuth Password Null',
        image: undefined,
      };

      await authService.validateOAuthUser(oauthUserData);

      const dbUser = await prismaService.user.findUnique({
        where: { email: oauthUserData.email },
      });

      expect(dbUser).toBeDefined();
      expect(dbUser?.passwordHash).toBeNull();
    });

    it('should not allow OAuth users to login with password', async () => {
      // Create OAuth user
      await prismaService.user.create({
        data: {
          username: 'oauth_test_no_password',
          email: 'oauth-test-no-password@example.com',
          name: 'OAuth No Password',
          provider: 'GOOGLE',
          providerId: 'test-provider-id-no-password',
          passwordHash: null,
        },
      });

      // Try to login with password (should fail)
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'oauth_test_no_password',
          password: 'any-password',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Invalid credentials');
        });
    });
  });

  describe('OAuth Integration with existing JWT system', () => {
    it('should work alongside LOCAL authentication', async () => {
      // SHA-256 hash of "Test123!" for testing
      const testPasswordHash =
        'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3';

      // Create LOCAL user
      const localUserResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'oauth_test_local',
          email: 'oauth-test-local@example.com',
          password: testPasswordHash,
          name: 'Local User',
        })
        .expect(201);

      expect(localUserResponse.body.user.provider).toBe('LOCAL');
      expect(localUserResponse.body.accessToken).toBeUndefined();
      expect(localUserResponse.headers['set-cookie']).toBeDefined();

      // Create OAuth user with different email
      const oauthUserData = {
        provider: 'GOOGLE' as const,
        providerId: 'test-provider-id-integration',
        email: 'oauth-test-oauth@example.com',
        name: 'OAuth User',
        image: undefined,
      };

      const oauthUser = await authService.validateOAuthUser(oauthUserData);

      expect(oauthUser.provider).toBe('GOOGLE');

      // Both users should be able to access their profiles
      const localLoginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'oauth_test_local',
          password: testPasswordHash,
        })
        .expect(200);

      expect(localLoginResponse.body.accessToken).toBeUndefined();
      expect(localLoginResponse.headers['set-cookie']).toBeDefined();

      const oauthLoginResult = await authService.loginWithOAuth(oauthUser);

      // Extract accessToken from cookie for testing
      const localCookies = localLoginResponse.headers['set-cookie'];
      const localAccessToken = Array.isArray(localCookies)
        ? localCookies[0].split(';')[0].split('=')[1]
        : localCookies.split(';')[0].split('=')[1];

      // Test LOCAL user profile
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Cookie', `accessToken=${localAccessToken}`)
        .expect(200);

      // Test OAuth user profile (still using direct token since it's from authService)
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${oauthLoginResult.accessToken}`)
        .expect(200);
    });

    it('should set HTTP-only cookie on registration', async () => {
      // SHA-256 hash of "Test123!" for testing
      const testPasswordHash =
        'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3';

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'oauth_test_cookie_register',
          email: 'oauth-test-cookie-register@example.com',
          password: testPasswordHash,
          name: 'Cookie Register User',
        })
        .expect(201);

      expect(response.body).not.toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.headers['set-cookie']).toBeDefined();

      const setCookieHeader = response.headers['set-cookie'][0];
      expect(setCookieHeader).toContain('accessToken=');
      expect(setCookieHeader).toContain('HttpOnly');
      expect(setCookieHeader).toContain('Path=/');
    });

    it('should set HTTP-only cookie on login', async () => {
      // SHA-256 hash of "Test123!" for testing
      const testPasswordHash =
        'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3';

      // First register user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'oauth_test_cookie_login',
          email: 'oauth-test-cookie-login@example.com',
          password: testPasswordHash,
          name: 'Cookie Login User',
        })
        .expect(201);

      // Then login
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'oauth_test_cookie_login',
          password: testPasswordHash,
        })
        .expect(200);

      expect(response.body).not.toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.headers['set-cookie']).toBeDefined();

      const setCookieHeader = response.headers['set-cookie'][0];
      expect(setCookieHeader).toContain('accessToken=');
      expect(setCookieHeader).toContain('HttpOnly');
      expect(setCookieHeader).toContain('Path=/');
    });
  });
});
