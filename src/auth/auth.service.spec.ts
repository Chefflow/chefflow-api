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
});
