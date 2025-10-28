import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
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

      return this.generateAuthResponse(user);
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

      return this.generateAuthResponse(user);
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

  private async generateAuthResponse(user: any) {
    const payload = {
      username: user.username,
      sub: user.username,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: new UserEntity(user),
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
    const payload = {
      username: user.username,
      sub: user.username,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: new UserEntity(user),
    };
  }
}
