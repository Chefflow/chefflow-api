import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthProvider } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateOAuthUser', () => {
    const oauthData = {
      provider: 'GOOGLE' as AuthProvider,
      providerId: 'google-123',
      email: 'test@example.com',
      name: 'Test User',
      image: 'https://example.com/photo.jpg',
    };

    it('should return existing user if found by provider and providerId', async () => {
      const existingUser = {
        username: 'existing_user',
        email: 'test@example.com',
        provider: 'GOOGLE',
        providerId: 'google-123',
        name: 'Test User',
        image: 'https://example.com/photo.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findFirst.mockResolvedValue(existingUser);

      const result = await service.validateOAuthUser(oauthData);

      expect(result).toEqual(existingUser);
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          provider: 'GOOGLE',
          providerId: 'google-123',
        },
      });
      expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });

    it('should link OAuth account to existing user by email', async () => {
      const existingLocalUser = {
        username: 'local_user',
        email: 'test@example.com',
        provider: 'LOCAL',
        providerId: null,
        name: 'Local User',
        image: null,
        passwordHash: 'hashed_password',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedUser = {
        ...existingLocalUser,
        provider: 'GOOGLE',
        providerId: 'google-123',
        image: 'https://example.com/photo.jpg',
      };

      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(existingLocalUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.validateOAuthUser(oauthData);

      expect(result).toEqual(updatedUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { username: 'local_user' },
        data: {
          provider: 'GOOGLE',
          providerId: 'google-123',
          image: 'https://example.com/photo.jpg',
        },
      });
    });

    it('should preserve existing image when linking if OAuth has no image', async () => {
      const existingLocalUser = {
        username: 'local_user',
        email: 'test@example.com',
        provider: 'LOCAL',
        providerId: null,
        name: 'Local User',
        image: 'https://existing.com/avatar.jpg',
        passwordHash: 'hashed_password',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const oauthDataNoImage = {
        ...oauthData,
        image: undefined,
      };

      const updatedUser = {
        ...existingLocalUser,
        provider: 'GOOGLE',
        providerId: 'google-123',
      };

      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(existingLocalUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.validateOAuthUser(oauthDataNoImage);

      expect(result).toEqual(updatedUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { username: 'local_user' },
        data: {
          provider: 'GOOGLE',
          providerId: 'google-123',
          image: 'https://existing.com/avatar.jpg',
        },
      });
    });

    it('should create new user when no existing user found', async () => {
      const newUser = {
        username: 'test',
        email: 'test@example.com',
        provider: 'GOOGLE',
        providerId: 'google-123',
        name: 'Test User',
        image: 'https://example.com/photo.jpg',
        passwordHash: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null) // Email check
        .mockResolvedValueOnce(null); // Username availability check
      mockPrismaService.user.create.mockResolvedValue(newUser);

      const result = await service.validateOAuthUser(oauthData);

      expect(result).toEqual(newUser);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          username: 'test',
          email: 'test@example.com',
          name: 'Test User',
          image: 'https://example.com/photo.jpg',
          provider: 'GOOGLE',
          providerId: 'google-123',
          passwordHash: null,
        },
      });
    });

    it('should generate unique username when base username is taken', async () => {
      const newUser = {
        username: 'test1',
        email: 'test@example.com',
        provider: 'GOOGLE',
        providerId: 'google-123',
        name: 'Test User',
        image: 'https://example.com/photo.jpg',
        passwordHash: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null) // Email check
        .mockResolvedValueOnce({ username: 'test' }) // First username taken
        .mockResolvedValueOnce(null); // Second username available
      mockPrismaService.user.create.mockResolvedValue(newUser);

      const result = await service.validateOAuthUser(oauthData);

      expect(result).toEqual(newUser);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          username: 'test1',
          email: 'test@example.com',
          name: 'Test User',
          image: 'https://example.com/photo.jpg',
          provider: 'GOOGLE',
          providerId: 'google-123',
          passwordHash: null,
        },
      });
    });

    it('should sanitize email to create valid username', async () => {
      const oauthDataComplexEmail = {
        provider: 'GOOGLE' as AuthProvider,
        providerId: 'google-456',
        email: 'test.user+tag@example.com',
        name: 'Test User',
        image: undefined,
      };

      const newUser = {
        username: 'test_user_tag',
        email: 'test.user+tag@example.com',
        provider: 'GOOGLE',
        providerId: 'google-456',
        name: 'Test User',
        image: null,
        passwordHash: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null) // Email check
        .mockResolvedValueOnce(null); // Username check
      mockPrismaService.user.create.mockResolvedValue(newUser);

      const result = await service.validateOAuthUser(oauthDataComplexEmail);

      expect(result).toEqual(newUser);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          username: 'test_user_tag',
          email: 'test.user+tag@example.com',
          name: 'Test User',
          image: undefined,
          provider: 'GOOGLE',
          providerId: 'google-456',
          passwordHash: null,
        },
      });
    });

    it('should use email prefix as name when name is not provided', async () => {
      const oauthDataNoName = {
        provider: 'GOOGLE' as AuthProvider,
        providerId: 'google-789',
        email: 'noname@example.com',
        name: undefined,
        image: undefined,
      };

      const newUser = {
        username: 'noname',
        email: 'noname@example.com',
        provider: 'GOOGLE',
        providerId: 'google-789',
        name: 'noname',
        image: null,
        passwordHash: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrismaService.user.create.mockResolvedValue(newUser);

      const result = await service.validateOAuthUser(oauthDataNoName);

      expect(result).toEqual(newUser);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          username: 'noname',
          email: 'noname@example.com',
          name: 'noname',
          image: undefined,
          provider: 'GOOGLE',
          providerId: 'google-789',
          passwordHash: null,
        },
      });
    });

    it('should handle very long username by incrementing counter', async () => {
      const oauthDataLongEmail = {
        provider: 'GOOGLE' as AuthProvider,
        providerId: 'google-999',
        email: 'verylongemailaddress@example.com',
        name: 'Long Name User',
        image: undefined,
      };

      const newUser = {
        username: 'verylongemailaddress2',
        email: 'verylongemailaddress@example.com',
        provider: 'GOOGLE',
        providerId: 'google-999',
        name: 'Long Name User',
        image: null,
        passwordHash: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null) // Email check
        .mockResolvedValueOnce({ username: 'verylongemailaddress' }) // Base taken
        .mockResolvedValueOnce({ username: 'verylongemailaddress1' }) // +1 taken
        .mockResolvedValueOnce(null); // +2 available
      mockPrismaService.user.create.mockResolvedValue(newUser);

      const result = await service.validateOAuthUser(oauthDataLongEmail);

      expect(result).toEqual(newUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(4);
    });
  });

  describe('loginWithOAuth', () => {
    it('should generate JWT token for OAuth user', async () => {
      const user = {
        username: 'oauth_user',
        email: 'oauth@example.com',
        provider: 'GOOGLE',
        providerId: 'google-123',
        name: 'OAuth User',
        image: 'https://example.com/photo.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockToken = 'mock-jwt-token';
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await service.loginWithOAuth(user);

      expect(result).toHaveProperty('accessToken', mockToken);
      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('username', 'oauth_user');
      expect(result.user).toHaveProperty('email', 'oauth@example.com');
      expect(jwtService.sign).toHaveBeenCalledWith({
        username: 'oauth_user',
        sub: 'oauth_user',
      });
    });

    it('should wrap user in UserEntity which excludes sensitive data', async () => {
      const user = {
        username: 'oauth_user',
        email: 'oauth@example.com',
        provider: 'GOOGLE',
        providerId: 'google-123',
        name: 'OAuth User',
        image: 'https://example.com/photo.jpg',
        passwordHash: 'should-not-be-exposed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockToken = 'mock-jwt-token';
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await service.loginWithOAuth(user);

      // UserEntity is used, which will exclude passwordHash when serialized
      expect(result.user.constructor.name).toBe('UserEntity');
      expect(result.user).toHaveProperty('username', 'oauth_user');
      expect(result.user).toHaveProperty('email', 'oauth@example.com');
    });
  });
});
