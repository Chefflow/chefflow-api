import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from '../auth.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let authService: AuthService;
  let configService: ConfigService;

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

  const mockAuthService = {
    validateUser: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_SECRET') return 'test-secret-key';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    authService = module.get<AuthService>(AuthService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    const payload = {
      username: 'testuser',
      sub: 'testuser',
      iat: 1234567890,
      exp: 9999999999,
    };

    it('should return user when user exists', async () => {
      mockAuthService.validateUser.mockResolvedValue(mockUser);

      const result = await strategy.validate(payload);

      expect(result).toEqual(mockUser);
      expect(authService.validateUser).toHaveBeenCalledWith('testuser');
      expect(authService.validateUser).toHaveBeenCalledTimes(1);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockAuthService.validateUser.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(payload)).rejects.toThrow(
        'User not found',
      );
      expect(authService.validateUser).toHaveBeenCalledWith('testuser');
    });

    it('should throw UnauthorizedException when user is undefined', async () => {
      mockAuthService.validateUser.mockResolvedValue(undefined);

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authService.validateUser).toHaveBeenCalledWith('testuser');
    });

    it('should handle different usernames in payload', async () => {
      const differentPayload = {
        username: 'anotheruser',
        sub: 'anotheruser',
        iat: 1234567890,
        exp: 9999999999,
      };

      const anotherUser = { ...mockUser, username: 'anotheruser' };
      mockAuthService.validateUser.mockResolvedValue(anotherUser);

      const result = await strategy.validate(differentPayload);

      expect(result).toEqual(anotherUser);
      expect(authService.validateUser).toHaveBeenCalledWith('anotheruser');
    });
  });

  describe('constructor', () => {
    it('should call configService.get with JWT_SECRET', () => {
      expect(configService.get).toHaveBeenCalledWith('JWT_SECRET');
    });
  });
});
