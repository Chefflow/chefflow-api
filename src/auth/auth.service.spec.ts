import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_SECRET') return 'access-secret';
      if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
      return null;
    }),
  };

  beforeEach(async () => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTokens', () => {
    it('should return access and refresh tokens', async () => {
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue('token');
      const tokens = await service.getTokens('userId', 'username');
      expect(tokens).toEqual({
        accessToken: 'token',
        refreshToken: 'token',
      });
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateRefreshToken', () => {
    it('should hash and update refresh token', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      await service.updateRefreshToken('username', 'token');
      expect(bcrypt.hash).toHaveBeenCalledWith('token', 10);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { username: 'username' },
        data: { hashedRefreshToken: 'hashed' },
      });
    });
  });

  describe('refreshTokens', () => {
    it('should throw ForbiddenException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      await expect(service.refreshTokens('username', 'token')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException if user has no refresh token', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        username: 'username',
        hashedRefreshToken: null,
      });
      await expect(service.refreshTokens('username', 'token')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException if token mismatch', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        username: 'username',
        hashedRefreshToken: 'hash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.refreshTokens('username', 'token')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return new tokens if valid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        username: 'username',
        hashedRefreshToken: 'hash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jest
        .spyOn(service, 'getTokens')
        .mockResolvedValue({ accessToken: 'new-at', refreshToken: 'new-rt' });
      jest.spyOn(service, 'updateRefreshToken').mockResolvedValue(undefined);

      const tokens = await service.refreshTokens('username', 'token');
      expect(tokens).toEqual({ accessToken: 'new-at', refreshToken: 'new-rt' });
      expect(service.updateRefreshToken).toHaveBeenCalledWith(
        'username',
        'new-rt',
      );
    });
  });

  describe('logout', () => {
    it('should clear refresh token', async () => {
      await service.logout('username');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { username: 'username' },
        data: { hashedRefreshToken: null },
      });
    });
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerDto = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      };

      const hashedPassword = 'hashed-password';
      const createdUser = {
        username: 'newuser',
        email: 'new@example.com',
        passwordHash: hashedPassword,
        name: 'New User',
        provider: 'LOCAL',
      };

      mockPrismaService.user.findFirst.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrismaService.user.create.mockResolvedValue(createdUser);
      jest.spyOn(service, 'getTokens').mockResolvedValue({
        accessToken: 'at',
        refreshToken: 'rt',
      });
      jest.spyOn(service, 'updateRefreshToken').mockResolvedValue(undefined);

      const result = await service.register(registerDto);

      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ username: 'newuser' }, { email: 'new@example.com' }],
        },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
    });

    it('should throw ConflictException if username exists', async () => {
      const registerDto = {
        username: 'existing',
        email: 'new@example.com',
        password: 'password123',
        name: 'Existing User',
      };

      mockPrismaService.user.findFirst.mockResolvedValue({
        username: 'existing',
        email: 'other@example.com',
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        'Username already exists',
      );
    });

    it('should throw ConflictException if email exists', async () => {
      const registerDto = {
        username: 'newuser',
        email: 'existing@example.com',
        password: 'password123',
        name: 'New User',
      };

      mockPrismaService.user.findFirst.mockResolvedValue({
        username: 'otheruser',
        email: 'existing@example.com',
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        'Email already exists',
      );
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginDto = {
        username: 'testuser',
        password: 'password123',
      };

      const user = {
        username: 'testuser',
        passwordHash: 'hashed-password',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jest.spyOn(service, 'getTokens').mockResolvedValue({
        accessToken: 'at',
        refreshToken: 'rt',
      });
      jest.spyOn(service, 'updateRefreshToken').mockResolvedValue(undefined);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const loginDto = {
        username: 'nonexistent',
        password: 'password123',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const loginDto = {
        username: 'testuser',
        password: 'wrongpassword',
      };

      const user = {
        username: 'testuser',
        passwordHash: 'hashed-password',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user has no password (OAuth user)', async () => {
      const loginDto = {
        username: 'oauthuser',
        password: 'password123',
      };

      const user = {
        username: 'oauthuser',
        passwordHash: null,
        provider: 'GOOGLE',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateUser', () => {
    it('should return user if found', async () => {
      const user = {
        username: 'testuser',
        email: 'test@example.com',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user);

      const result = await service.validateUser('testuser');

      expect(result).toEqual(user);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
    });

    it('should return null if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('validateOAuthUser', () => {
    it('should return existing OAuth user', async () => {
      const oauthData = {
        provider: 'GOOGLE' as const,
        providerId: '12345',
        email: 'oauth@example.com',
        name: 'OAuth User',
      };

      const existingUser = {
        username: 'oauthuser',
        email: 'oauth@example.com',
        provider: 'GOOGLE',
        providerId: '12345',
      };

      // Mock sequence:
      // 1. findFirst by provider+providerId returns existing user
      mockPrismaService.user.findFirst.mockResolvedValueOnce(existingUser);

      const result = await service.validateOAuthUser(oauthData);

      expect(result).toEqual(existingUser);
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          provider: 'GOOGLE',
          providerId: '12345',
        },
      });
    });

    it('should link OAuth to existing LOCAL user by email', async () => {
      const oauthData = {
        provider: 'GOOGLE' as const,
        providerId: '12345',
        email: 'existing@example.com',
        name: 'OAuth User',
      };

      const existingLocalUser = {
        username: 'existinguser',
        email: 'existing@example.com',
        provider: 'LOCAL',
        passwordHash: 'hash',
      };

      const updatedUser = {
        ...existingLocalUser,
        provider: 'GOOGLE',
        providerId: '12345',
      };

      // Mock sequence:
      // 1. findFirst by provider+providerId returns null (no OAuth user)
      mockPrismaService.user.findFirst.mockResolvedValueOnce(null);

      // 2. findUnique by email returns existing LOCAL user
      mockPrismaService.user.findUnique.mockResolvedValueOnce(
        existingLocalUser,
      );

      mockPrismaService.user.update.mockResolvedValueOnce(updatedUser);

      const result = await service.validateOAuthUser(oauthData);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { username: 'existinguser' },
        data: expect.objectContaining({
          provider: 'GOOGLE',
          providerId: '12345',
        }),
      });
      expect(result).toEqual(updatedUser);
    });

    it('should create new user if OAuth user does not exist', async () => {
      const oauthData = {
        provider: 'GOOGLE' as const,
        providerId: '12345',
        email: 'new@example.com',
        name: 'New OAuth User',
        image: 'https://example.com/avatar.jpg',
      };

      const newUser = {
        username: 'new',
        email: 'new@example.com',
        name: 'New OAuth User',
        image: 'https://example.com/avatar.jpg',
        provider: 'GOOGLE',
        providerId: '12345',
        passwordHash: null,
      };

      // Mock sequence:
      // 1. findFirst by provider+providerId returns null (no OAuth user)
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      // 2. findUnique by email returns null (email doesn't exist)
      // 3. findUnique by username in while loop returns null (username available)
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null) // Email check
        .mockResolvedValueOnce(null); // Username check in while loop

      mockPrismaService.user.create.mockResolvedValue(newUser);

      const result = await service.validateOAuthUser(oauthData);

      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'new@example.com',
          provider: 'GOOGLE',
          providerId: '12345',
          passwordHash: null,
        }),
      });
      expect(result).toEqual(newUser);
    });

    it('should generate unique username if base username is taken', async () => {
      const oauthData = {
        provider: 'GOOGLE' as const,
        providerId: '12345',
        email: 'test@example.com',
        name: 'Test User',
      };

      // Mock sequence:
      // 1. findFirst by provider+providerId returns null (no OAuth user)
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      // 2. findUnique by email returns null (email doesn't exist)
      // 3. First while loop iteration: findUnique by username='test' returns user (taken)
      // 4. Second while loop iteration: findUnique by username='test1' returns null (available)
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null) // Email check
        .mockResolvedValueOnce({ username: 'test' } as any) // Username 'test' taken
        .mockResolvedValueOnce(null); // Username 'test1' available

      mockPrismaService.user.create.mockResolvedValue({
        username: 'test1',
        email: 'test@example.com',
        provider: 'GOOGLE',
        providerId: '12345',
      } as any);

      await service.validateOAuthUser(oauthData);

      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          username: 'test1',
        }),
      });
    });
  });

  describe('loginWithOAuth', () => {
    it('should generate tokens for OAuth user', async () => {
      const user = {
        username: 'oauthuser',
        email: 'oauth@example.com',
        passwordHash: null,
        hashedRefreshToken: null,
        name: 'OAuth User',
        image: null,
        provider: 'GOOGLE' as const,
        providerId: '12345',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service, 'getTokens').mockResolvedValue({
        accessToken: 'at',
        refreshToken: 'rt',
      });
      jest.spyOn(service, 'updateRefreshToken').mockResolvedValue(undefined);

      const result = await service.loginWithOAuth(user);

      expect(service.getTokens).toHaveBeenCalledWith('oauthuser', 'oauthuser');
      expect(service.updateRefreshToken).toHaveBeenCalledWith(
        'oauthuser',
        'rt',
      );
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
    });
  });
});
