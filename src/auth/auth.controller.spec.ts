import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Response, Request } from 'express';
import { User } from '@prisma/client';

// Test constants
const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_PATH = '/auth/refresh';
const DEFAULT_FRONTEND_URL = 'http://localhost:3000';

// Test data factories
interface RequestWithCsrfToken extends Request {
  csrfToken?: string;
}

interface RequestWithUserAndRefreshToken extends Request {
  user?: User & { refreshToken?: string };
}

const createMockUser = (overrides?: Partial<User>): Partial<User> => ({
  username: 'testuser',
  email: 'test@example.com',
  name: 'Test User',
  ...overrides,
});

const createMockAuthResponse = (overrides?: any) => ({
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  user: createMockUser(),
  ...overrides,
});

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshTokens: jest.fn(),
    logout: jest.fn(),
    loginWithOAuth: jest.fn(),
  };

  const mockResponse = () => {
    const res: Partial<Response> = {};
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.redirect = jest.fn().mockReturnValue(res);
    return res as Response;
  };

  beforeEach(async () => {
    // Clear all mocks before each test for isolation
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should set cookies and return user when credentials are valid', async () => {
      // Arrange
      const res = mockResponse();
      const loginDto = { username: 'user', password: 'password' };
      const authResponse = createMockAuthResponse({
        user: createMockUser({ username: 'user' }),
      });
      mockAuthService.login.mockResolvedValue(authResponse);

      // Act
      const result = await controller.login(loginDto, res);

      // Assert - verify access token cookie
      expect(res.cookie).toHaveBeenCalledWith(
        'accessToken',
        authResponse.accessToken,
        expect.objectContaining({
          httpOnly: true,
          maxAge: ACCESS_TOKEN_MAX_AGE,
          sameSite: 'lax',
        }),
      );

      // Assert - verify refresh token cookie
      expect(res.cookie).toHaveBeenCalledWith(
        'Refresh',
        authResponse.refreshToken,
        expect.objectContaining({
          httpOnly: true,
          path: REFRESH_TOKEN_PATH,
          sameSite: 'lax',
        }),
      );

      // Assert - verify return value
      expect(result).toEqual({ user: expect.any(Object) });
      expect(result.user).toHaveProperty('username', 'user');
    });
  });

  describe('refreshTokens', () => {
    it('should set new cookies when refresh token is valid', async () => {
      // Arrange
      const res = mockResponse();
      const req: Partial<RequestWithUserAndRefreshToken> = {
        user: {
          ...(createMockUser({ username: 'user' }) as User),
          refreshToken: 'old-refresh-token',
        },
      };
      const tokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };
      mockAuthService.refreshTokens.mockResolvedValue(tokens);

      // Act
      await controller.refreshTokens(
        req as RequestWithUserAndRefreshToken,
        res,
      );

      // Assert - verify service was called with correct params
      expect(authService.refreshTokens).toHaveBeenCalledWith(
        'user',
        'old-refresh-token',
      );

      // Assert - verify access token cookie
      expect(res.cookie).toHaveBeenCalledWith(
        'accessToken',
        'new-access-token',
        expect.objectContaining({
          httpOnly: true,
          maxAge: ACCESS_TOKEN_MAX_AGE,
        }),
      );

      // Assert - verify refresh token cookie
      expect(res.cookie).toHaveBeenCalledWith(
        'Refresh',
        'new-refresh-token',
        expect.objectContaining({
          httpOnly: true,
          path: REFRESH_TOKEN_PATH,
        }),
      );
    });
  });

  describe('logout', () => {
    it('should clear authentication cookies when user logs out', async () => {
      // Arrange
      const res = mockResponse();
      const user = createMockUser({ username: 'user' }) as User;
      mockAuthService.logout.mockResolvedValue(undefined);

      // Act
      await controller.logout(user, res);

      // Assert - verify service was called
      expect(authService.logout).toHaveBeenCalledWith('user');

      // Assert - verify cookies were cleared
      expect(res.clearCookie).toHaveBeenCalledWith('accessToken');
      expect(res.clearCookie).toHaveBeenCalledWith('Refresh', {
        path: REFRESH_TOKEN_PATH,
      });
    });

    it('should return success message after logout', async () => {
      // Arrange
      const res = mockResponse();
      const user = createMockUser({ username: 'user' }) as User;
      mockAuthService.logout.mockResolvedValue(undefined);

      // Act
      const result = await controller.logout(user, res);

      // Assert
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('register', () => {
    it('should register new user and set authentication cookies', async () => {
      // Arrange
      const res = mockResponse();
      const registerDto = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      };
      const authResponse = createMockAuthResponse({
        user: createMockUser({
          username: 'newuser',
          email: 'new@example.com',
          name: 'New User',
        }),
      });
      mockAuthService.register.mockResolvedValue(authResponse);

      // Act
      const result = await controller.register(registerDto, res);

      // Assert - verify service was called
      expect(authService.register).toHaveBeenCalledWith(registerDto);

      // Assert - verify access token cookie
      expect(res.cookie).toHaveBeenCalledWith(
        'accessToken',
        authResponse.accessToken,
        expect.objectContaining({
          httpOnly: true,
          maxAge: ACCESS_TOKEN_MAX_AGE,
          sameSite: 'lax',
        }),
      );

      // Assert - verify refresh token cookie
      expect(res.cookie).toHaveBeenCalledWith(
        'Refresh',
        authResponse.refreshToken,
        expect.objectContaining({
          httpOnly: true,
          path: REFRESH_TOKEN_PATH,
          sameSite: 'lax',
        }),
      );

      // Assert - verify return value
      expect(result).toEqual({ user: expect.any(Object) });
      expect(result.user).toHaveProperty('username', 'newuser');
    });
  });

  describe('getProfile', () => {
    it('should return user profile when authenticated', () => {
      // Arrange
      const user = createMockUser({
        username: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
      }) as User;

      // Act
      const result = controller.getProfile(user);

      // Assert
      expect(result).toHaveProperty('username', 'testuser');
      expect(result).toHaveProperty('email', 'test@example.com');
    });
  });

  describe('getCsrfToken', () => {
    it('should return CSRF token from request when present', () => {
      // Arrange
      const req: Partial<RequestWithCsrfToken> = {
        csrfToken: 'test-csrf-token-12345',
      };

      // Act
      const result = controller.getCsrfToken(req as RequestWithCsrfToken);

      // Assert
      expect(result).toEqual({ csrfToken: 'test-csrf-token-12345' });
    });

    it('should handle missing CSRF token gracefully', () => {
      // Arrange
      const req: Partial<RequestWithCsrfToken> = {};

      // Act
      const result = controller.getCsrfToken(req as RequestWithCsrfToken);

      // Assert
      expect(result).toEqual({ csrfToken: undefined });
    });
  });

  describe('googleAuth', () => {
    it('should initiate Google OAuth flow', async () => {
      // Act & Assert
      // This endpoint just triggers the GoogleOAuthGuard, so we verify it returns undefined
      await expect(controller.googleAuth()).resolves.toBeUndefined();
    });
  });

  describe('googleAuthCallback', () => {
    it('should set cookies and redirect to frontend after successful OAuth', async () => {
      // Arrange
      const res = mockResponse();
      const user = createMockUser({
        username: 'googleuser',
        email: 'google@example.com',
        provider: 'GOOGLE',
      }) as User;
      const authResponse = createMockAuthResponse({ user });
      mockAuthService.loginWithOAuth.mockResolvedValue(authResponse);

      // Act
      await controller.googleAuthCallback(user, res);

      // Assert - verify service was called
      expect(authService.loginWithOAuth).toHaveBeenCalledWith(user);

      // Assert - verify cookies were set
      expect(res.cookie).toHaveBeenCalledWith(
        'accessToken',
        authResponse.accessToken,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
        }),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'Refresh',
        authResponse.refreshToken,
        expect.objectContaining({
          httpOnly: true,
          path: REFRESH_TOKEN_PATH,
        }),
      );

      // Assert - verify redirect to frontend
      expect(res.redirect).toHaveBeenCalledWith(
        `${DEFAULT_FRONTEND_URL}/auth/callback`,
      );
    });

    it('should use custom frontend URL from environment variable', async () => {
      // Arrange
      const originalEnv = process.env.FRONTEND_URL;
      const customUrl = 'https://custom-frontend.com';
      process.env.FRONTEND_URL = customUrl;

      const res = mockResponse();
      const user = createMockUser({ username: 'googleuser' }) as User;
      const authResponse = createMockAuthResponse({ user });
      mockAuthService.loginWithOAuth.mockResolvedValue(authResponse);

      // Act
      await controller.googleAuthCallback(user, res);

      // Assert - verify redirect to custom URL
      expect(res.redirect).toHaveBeenCalledWith(`${customUrl}/auth/callback`);

      // Cleanup
      process.env.FRONTEND_URL = originalEnv;
    });
  });

  describe('refreshTokens - edge cases', () => {
    it('should throw error when user is missing from request', async () => {
      // Arrange
      const res = mockResponse();
      const req: Partial<RequestWithUserAndRefreshToken> = {};

      // Act & Assert
      await expect(
        controller.refreshTokens(req as RequestWithUserAndRefreshToken, res),
      ).rejects.toThrow('Invalid user or refresh token');
    });

    it('should throw error when refresh token is missing', async () => {
      // Arrange
      const res = mockResponse();
      const req: Partial<RequestWithUserAndRefreshToken> = {
        user: { ...(createMockUser({ username: 'user' }) as User) },
      };

      // Act & Assert
      await expect(
        controller.refreshTokens(req as RequestWithUserAndRefreshToken, res),
      ).rejects.toThrow('Invalid user or refresh token');
    });

    it('should return success message when tokens refreshed successfully', async () => {
      // Arrange
      const res = mockResponse();
      const req: Partial<RequestWithUserAndRefreshToken> = {
        user: {
          ...(createMockUser({ username: 'user' }) as User),
          refreshToken: 'old-refresh-token',
        },
      };
      const tokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };
      mockAuthService.refreshTokens.mockResolvedValue(tokens);

      // Act
      const result = await controller.refreshTokens(
        req as RequestWithUserAndRefreshToken,
        res,
      );

      // Assert
      expect(result).toEqual({ message: 'Tokens refreshed' });
    });
  });
});
