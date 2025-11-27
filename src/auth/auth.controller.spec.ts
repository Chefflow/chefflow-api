import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserEntity } from '../users/entities/user.entity';
import { Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockUser = {
    username: 'testuser',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedPassword',
    image: null,
    provider: 'LOCAL' as const,
    providerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAuthResponse = {
    accessToken: 'mock-jwt-token',
    user: mockUser,
  };

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
  };

  const mockResponse = () => {
    const res = {} as Response;
    res.cookie = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.redirect = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test1234!',
      name: 'Test User',
    };

    it('should register a new user and set HTTP-only cookie', async () => {
      mockAuthService.register.mockResolvedValue(mockAuthResponse);
      const res = mockResponse();

      await controller.register(registerDto, res);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(authService.register).toHaveBeenCalledTimes(1);
      expect(res.cookie).toHaveBeenCalledWith(
        'accessToken',
        'mock-jwt-token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: '/',
        }),
      );
      expect(res.json).toHaveBeenCalledWith({ user: mockUser });
    });

    it('should handle registration errors', async () => {
      const error = new Error('Username already exists');
      mockAuthService.register.mockRejectedValue(error);
      const res = mockResponse();

      await expect(controller.register(registerDto, res)).rejects.toThrow(
        error,
      );
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should pass all registration data to service', async () => {
      mockAuthService.register.mockResolvedValue(mockAuthResponse);
      const res = mockResponse();

      await controller.register(registerDto, res);

      expect(authService.register).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Test1234!',
          name: 'Test User',
        }),
      );
    });

    it('should return only user data without accessToken in response body', async () => {
      mockAuthService.register.mockResolvedValue(mockAuthResponse);
      const res = mockResponse();

      await controller.register(registerDto, res);

      expect(res.json).toHaveBeenCalledWith({ user: mockUser });
      expect(res.json).not.toHaveBeenCalledWith(
        expect.objectContaining({ accessToken: expect.anything() }),
      );
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      username: 'testuser',
      password: 'Test1234!',
    };

    it('should login user and set HTTP-only cookie', async () => {
      mockAuthService.login.mockResolvedValue(mockAuthResponse);
      const res = mockResponse();

      await controller.login(loginDto, res);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(authService.login).toHaveBeenCalledTimes(1);
      expect(res.cookie).toHaveBeenCalledWith(
        'accessToken',
        'mock-jwt-token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: '/',
        }),
      );
      expect(res.json).toHaveBeenCalledWith({ user: mockUser });
    });

    it('should handle login errors', async () => {
      const error = new Error('Invalid credentials');
      mockAuthService.login.mockRejectedValue(error);
      const res = mockResponse();

      await expect(controller.login(loginDto, res)).rejects.toThrow(error);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should set accessToken in HTTP-only cookie on successful login', async () => {
      mockAuthService.login.mockResolvedValue(mockAuthResponse);
      const res = mockResponse();

      await controller.login(loginDto, res);

      expect(res.cookie).toHaveBeenCalledWith(
        'accessToken',
        'mock-jwt-token',
        expect.anything(),
      );
    });

    it('should return user data on successful login', async () => {
      mockAuthService.login.mockResolvedValue(mockAuthResponse);
      const res = mockResponse();

      await controller.login(loginDto, res);

      expect(res.json).toHaveBeenCalledWith({
        user: expect.objectContaining({
          username: 'testuser',
          email: 'test@example.com',
        }),
      });
    });

    it('should return only user data without accessToken in response body', async () => {
      mockAuthService.login.mockResolvedValue(mockAuthResponse);
      const res = mockResponse();

      await controller.login(loginDto, res);

      expect(res.json).toHaveBeenCalledWith({ user: mockUser });
      expect(res.json).not.toHaveBeenCalledWith(
        expect.objectContaining({ accessToken: expect.anything() }),
      );
    });
  });

  describe('getProfile', () => {
    it('should return current user profile', () => {
      const result = controller.getProfile(mockUser);

      expect(result).toBeInstanceOf(UserEntity);
      expect(result.username).toBe('testuser');
      expect(result.email).toBe('test@example.com');
    });

    it('should return UserEntity instance', () => {
      const result = controller.getProfile(mockUser);

      expect(result).toBeInstanceOf(UserEntity);
    });

    it('should return profile with all safe fields', () => {
      const result = controller.getProfile(mockUser);

      expect(result).toHaveProperty('username');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('provider');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });

    it('should handle user with different providers', () => {
      const googleUser = {
        ...mockUser,
        provider: 'GOOGLE' as const,
        providerId: 'google-123',
      };

      const result = controller.getProfile(googleUser);

      expect(result.provider).toBe('GOOGLE');
      expect(result.providerId).toBe('google-123');
    });
  });
});
