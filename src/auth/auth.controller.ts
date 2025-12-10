import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Res,
  Req,
  UseFilters,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { UserEntity } from '../users/entities/user.entity';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { RefreshTokenExceptionFilter } from './filters/refresh-token-exception.filter';

interface RequestWithCsrfToken extends Request {
  csrfToken?: string;
}

interface RequestWithUserAndRefreshToken extends Request {
  user?: User & { refreshToken?: string };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true, // Always true (works on localhost for development)
      sameSite: isProduction ? 'lax' : 'none',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });

    res.cookie('Refresh', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: isProduction ? 'lax' : 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/auth/refresh',
    });
  }

  @Public()
  @Get('csrf')
  getCsrfToken(@Req() req: RequestWithCsrfToken) {
    return { csrfToken: req.csrfToken };
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const authResponse = await this.authService.register(registerDto);
    this.setAuthCookies(
      res,
      authResponse.accessToken,
      authResponse.refreshToken,
    );
    return { user: new UserEntity(authResponse.user) };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const authResponse = await this.authService.login(loginDto);
    this.setAuthCookies(
      res,
      authResponse.accessToken,
      authResponse.refreshToken,
    );
    return { user: new UserEntity(authResponse.user) };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  getProfile(@CurrentUser() user: User) {
    return new UserEntity(user);
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @UseFilters(RefreshTokenExceptionFilter)
  @Get('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @Req() req: RequestWithUserAndRefreshToken,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!req.user?.username || !req.user?.refreshToken) {
      throw new Error('Invalid user or refresh token');
    }
    const tokens = await this.authService.refreshTokens(
      req.user.username,
      req.user.refreshToken,
    );
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return { message: 'Tokens refreshed' };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('accessToken');
    res.clearCookie('Refresh', { path: '/auth/refresh' });
    return { message: 'Logged out successfully' };
  }

  @Public()
  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  async googleAuth() {}

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  async googleAuthCallback(@CurrentUser() user: User, @Res() res: Response) {
    const authResponse = await this.authService.loginWithOAuth(user);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    this.setAuthCookies(
      res,
      authResponse.accessToken,
      authResponse.refreshToken,
    );

    return res.redirect(`${frontendUrl}/auth/callback`);
  }
}
