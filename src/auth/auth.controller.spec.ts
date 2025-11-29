import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Response } from 'express';

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
    it('should set cookies and return user', async () => {
      const res = mockResponse();
      const loginDto = { username: 'user', password: 'password' };
      const authResponse = {
        accessToken: 'at',
        refreshToken: 'rt',
        user: { username: 'user' },
      };
      mockAuthService.login.mockResolvedValue(authResponse);

      await controller.login(loginDto, res);

      expect(res.cookie).toHaveBeenCalledWith(
        'accessToken',
        'at',
        expect.objectContaining({
          httpOnly: true,
          maxAge: 15 * 60 * 1000,
        }),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'Refresh',
        'rt',
        expect.objectContaining({
          httpOnly: true,
          path: '/auth/refresh',
        }),
      );
      expect(res.json).toHaveBeenCalledWith({ user: authResponse.user });
    });
  });

  describe('refreshTokens', () => {
    it('should set new cookies', async () => {
      const res = mockResponse();
      const req = { user: { username: 'user', refreshToken: 'old-rt' } } as any;
      const tokens = { accessToken: 'new-at', refreshToken: 'new-rt' };
      mockAuthService.refreshTokens.mockResolvedValue(tokens);

      await controller.refreshTokens(req, res);

      expect(authService.refreshTokens).toHaveBeenCalledWith('user', 'old-rt');
      expect(res.cookie).toHaveBeenCalledWith(
        'accessToken',
        'new-at',
        expect.any(Object),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'Refresh',
        'new-rt',
        expect.any(Object),
      );
    });
  });

  describe('logout', () => {
    it('should clear cookies', async () => {
      const res = mockResponse();
      const user = { username: 'user' };

      await controller.logout(user, res);

      expect(authService.logout).toHaveBeenCalledWith('user');
      expect(res.clearCookie).toHaveBeenCalledWith('accessToken');
      expect(res.clearCookie).toHaveBeenCalledWith('Refresh', {
        path: '/auth/refresh',
      });
    });
  });
});
