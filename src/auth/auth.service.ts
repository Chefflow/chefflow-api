import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { AuthProvider } from '@prisma/client';
import { UserEntity } from '../users/entities/user.entity';
import { OAuthUserData } from './dto/oauth-user.dto';
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { username, email, password, name } = registerDto;

    try {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          OR: [{ username }, { email }],
        },
      });

      if (existingUser) {
        if (existingUser.username === username) {
          throw new ConflictException('Username already exists');
        }
        throw new ConflictException('Email already exists');
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await this.prisma.user.create({
        data: {
          username,
          email,
          passwordHash,
          name,
          provider: AuthProvider.LOCAL,
        },
      });

      const tokens = await this.getTokens(user.username, user.username);
      await this.updateRefreshToken(user.username, tokens.refreshToken);
      return { ...tokens, user: new UserEntity(user) };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to register user');
    }
  }

  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;

    try {
      const user = await this.prisma.user.findUnique({
        where: { username },
      });

      if (!user || !user.passwordHash) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const tokens = await this.getTokens(user.username, user.username);
      await this.updateRefreshToken(user.username, tokens.refreshToken);
      return { ...tokens, user: new UserEntity(user) };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to login');
    }
  }

  async validateUser(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async logout(username: string) {
    return this.prisma.user.update({
      where: { username },
      data: { hashedRefreshToken: null },
    });
  }

  async refreshTokens(username: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user || !user.hashedRefreshToken)
      throw new ForbiddenException('Access Denied');

    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.hashedRefreshToken,
    );

    if (!refreshTokenMatches) throw new ForbiddenException('Access Denied');

    const tokens = await this.getTokens(user.username, user.username);
    await this.updateRefreshToken(user.username, tokens.refreshToken);
    return tokens;
  }

  async updateRefreshToken(username: string, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { username },
      data: {
        hashedRefreshToken: hash,
      },
    });
  }

  async getTokens(userId: string, username: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          username,
        },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: '15m',
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          username,
        },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: '7d',
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async validateOAuthUser(oauthData: OAuthUserData) {
    const { provider, providerId, email, name, image } = oauthData;

    let user = await this.prisma.user.findFirst({
      where: {
        provider,
        providerId,
      },
    });

    if (user) {
      return user;
    }

    const existingUserByEmail = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUserByEmail) {
      user = await this.prisma.user.update({
        where: { username: existingUserByEmail.username },
        data: {
          provider,
          providerId,
          image: image || existingUserByEmail.image,
        },
      });

      return user;
    }

    const baseUsername = email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_');

    let username = baseUsername;
    let counter = 1;

    while (await this.prisma.user.findUnique({ where: { username } })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    user = await this.prisma.user.create({
      data: {
        username,
        email,
        name: name || email.split('@')[0],
        image,
        provider,
        providerId,
        passwordHash: null,
      },
    });

    return user;
  }

  async loginWithOAuth(user: any) {
    const tokens = await this.getTokens(user.username, user.username);
    await this.updateRefreshToken(user.username, tokens.refreshToken);
    return { ...tokens, user: new UserEntity(user) };
  }
}
