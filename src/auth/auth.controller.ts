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
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { UserEntity } from '../users/entities/user.entity';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { Response } from 'express';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    res.cookie('Refresh', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/auth/refresh',
    });
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
  getProfile(@CurrentUser() user: any) {
    return new UserEntity(user);
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Get('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user as any;
    const tokens = await this.authService.refreshTokens(
      user.username,
      user.refreshToken,
    );
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return { message: 'Tokens refreshed' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(user.username);
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
  async googleAuthCallback(@CurrentUser() user: any, @Res() res: Response) {
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
