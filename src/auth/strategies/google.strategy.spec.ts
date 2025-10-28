import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GoogleStrategy } from './google.strategy';
import { AuthService } from '../auth.service';
import { Profile } from 'passport-google-oauth20';

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;
  let authService: AuthService;

  const mockConfigService = {
    getOrThrow: jest.fn((key: string) => {
      const config = {
        GOOGLE_CLIENT_ID: 'test-client-id',
        GOOGLE_CLIENT_SECRET: 'test-client-secret',
        GOOGLE_CALLBACK_URL: 'http://localhost:3001/auth/google/callback',
      };
      return config[key];
    }),
  };

  const mockAuthService = {
    validateOAuthUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    strategy = module.get<GoogleStrategy>(GoogleStrategy);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    const accessToken = 'google-access-token';
    const refreshToken = 'google-refresh-token';
    const done = jest.fn();

    it('should validate user with complete profile data', async () => {
      const profile: Partial<Profile> = {
        id: 'google-user-id-123',
        displayName: 'John Doe',
        name: {
          givenName: 'John',
          familyName: 'Doe',
          middleName: undefined,
        },
        emails: [
          {
            value: 'john.doe@example.com',
            verified: true,
          },
        ],
        photos: [
          {
            value: 'https://example.com/photo.jpg',
          },
        ],
      };

      const mockUser = {
        username: 'john_doe',
        email: 'john.doe@example.com',
        name: 'John Doe',
        provider: 'GOOGLE',
        providerId: 'google-user-id-123',
      };

      mockAuthService.validateOAuthUser.mockResolvedValue(mockUser);

      await strategy.validate(
        accessToken,
        refreshToken,
        profile as Profile,
        done,
      );

      expect(mockAuthService.validateOAuthUser).toHaveBeenCalledWith({
        provider: 'GOOGLE',
        providerId: 'google-user-id-123',
        email: 'john.doe@example.com',
        name: 'John Doe',
        image: 'https://example.com/photo.jpg',
      });

      expect(done).toHaveBeenCalledWith(undefined, mockUser);
    });

    it('should handle profile without photos', async () => {
      const profile: Partial<Profile> = {
        id: 'google-user-id-456',
        displayName: 'Jane Smith',
        name: {
          givenName: 'Jane',
          familyName: 'Smith',
          middleName: undefined,
        },
        emails: [
          {
            value: 'jane.smith@example.com',
            verified: true,
          },
        ],
        photos: [],
      };

      const mockUser = {
        username: 'jane_smith',
        email: 'jane.smith@example.com',
        name: 'Jane Smith',
        provider: 'GOOGLE',
        providerId: 'google-user-id-456',
      };

      mockAuthService.validateOAuthUser.mockResolvedValue(mockUser);

      await strategy.validate(
        accessToken,
        refreshToken,
        profile as Profile,
        done,
      );

      expect(mockAuthService.validateOAuthUser).toHaveBeenCalledWith({
        provider: 'GOOGLE',
        providerId: 'google-user-id-456',
        email: 'jane.smith@example.com',
        name: 'Jane Smith',
        image: undefined,
      });

      expect(done).toHaveBeenCalledWith(undefined, mockUser);
    });

    it('should use displayName when givenName and familyName are missing', async () => {
      const profile: Partial<Profile> = {
        id: 'google-user-id-789',
        displayName: 'Display Name User',
        name: undefined,
        emails: [
          {
            value: 'display@example.com',
            verified: true,
          },
        ],
      };

      const mockUser = {
        username: 'display',
        email: 'display@example.com',
        name: 'Display Name User',
        provider: 'GOOGLE',
        providerId: 'google-user-id-789',
      };

      mockAuthService.validateOAuthUser.mockResolvedValue(mockUser);

      await strategy.validate(
        accessToken,
        refreshToken,
        profile as Profile,
        done,
      );

      expect(mockAuthService.validateOAuthUser).toHaveBeenCalledWith({
        provider: 'GOOGLE',
        providerId: 'google-user-id-789',
        email: 'display@example.com',
        name: 'Display Name User',
        image: undefined,
      });

      expect(done).toHaveBeenCalledWith(undefined, mockUser);
    });

    it('should reject when no emails provided', async () => {
      const profile: Partial<Profile> = {
        id: 'google-user-id-no-email',
        displayName: 'No Email User',
        emails: [],
      };

      await strategy.validate(
        accessToken,
        refreshToken,
        profile as Profile,
        done,
      );

      expect(mockAuthService.validateOAuthUser).not.toHaveBeenCalled();
      expect(done).toHaveBeenCalledWith(
        new Error('No email provided by Google'),
        undefined,
      );
    });

    it('should reject when emails array is undefined', async () => {
      const profile: Partial<Profile> = {
        id: 'google-user-id-undefined-email',
        displayName: 'Undefined Email User',
        emails: undefined,
      };

      await strategy.validate(
        accessToken,
        refreshToken,
        profile as Profile,
        done,
      );

      expect(mockAuthService.validateOAuthUser).not.toHaveBeenCalled();
      expect(done).toHaveBeenCalledWith(
        new Error('No email provided by Google'),
        undefined,
      );
    });

    it('should reject when email is not verified', async () => {
      const profile: Partial<Profile> = {
        id: 'google-user-id-unverified',
        displayName: 'Unverified User',
        emails: [
          {
            value: 'unverified@example.com',
            verified: false,
          },
        ],
      };

      await strategy.validate(
        accessToken,
        refreshToken,
        profile as Profile,
        done,
      );

      expect(mockAuthService.validateOAuthUser).not.toHaveBeenCalled();
      expect(done).toHaveBeenCalledWith(
        new Error('Email not verified by Google'),
        undefined,
      );
    });

    it('should handle validateOAuthUser errors', async () => {
      const profile: Partial<Profile> = {
        id: 'google-user-id-error',
        displayName: 'Error User',
        name: {
          givenName: 'Error',
          familyName: 'User',
          middleName: undefined,
        },
        emails: [
          {
            value: 'error@example.com',
            verified: true,
          },
        ],
      };

      const error = new Error('Database connection failed');
      mockAuthService.validateOAuthUser.mockRejectedValue(error);

      await strategy.validate(
        accessToken,
        refreshToken,
        profile as Profile,
        done,
      );

      expect(mockAuthService.validateOAuthUser).toHaveBeenCalled();
      expect(done).toHaveBeenCalledWith(error, undefined);
    });

    it('should handle profile with multiple photos (use first one)', async () => {
      const profile: Partial<Profile> = {
        id: 'google-user-id-multi-photo',
        displayName: 'Multi Photo User',
        name: {
          givenName: 'Multi',
          familyName: 'Photo',
          middleName: undefined,
        },
        emails: [
          {
            value: 'multi@example.com',
            verified: true,
          },
        ],
        photos: [
          { value: 'https://example.com/photo1.jpg' },
          { value: 'https://example.com/photo2.jpg' },
        ],
      };

      const mockUser = {
        username: 'multi_photo',
        email: 'multi@example.com',
        name: 'Multi Photo',
        provider: 'GOOGLE',
        providerId: 'google-user-id-multi-photo',
      };

      mockAuthService.validateOAuthUser.mockResolvedValue(mockUser);

      await strategy.validate(
        accessToken,
        refreshToken,
        profile as Profile,
        done,
      );

      expect(mockAuthService.validateOAuthUser).toHaveBeenCalledWith({
        provider: 'GOOGLE',
        providerId: 'google-user-id-multi-photo',
        email: 'multi@example.com',
        name: 'Multi Photo',
        image: 'https://example.com/photo1.jpg', // Should use first photo
      });

      expect(done).toHaveBeenCalledWith(undefined, mockUser);
    });
  });
});
