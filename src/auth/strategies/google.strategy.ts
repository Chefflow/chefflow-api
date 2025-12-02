import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
      passReqToCallback: false,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const { id, name, emails, photos } = profile;
    if (!emails || emails.length === 0) {
      done(new Error('No email provided by Google'), undefined);
      return;
    }
    const primaryEmail = emails[0];
    if (primaryEmail.verified === false) {
      done(new Error('Email not verified by Google'), undefined);
      return;
    }
    try {
      const fullName =
        name?.givenName && name?.familyName
          ? `${name.givenName} ${name.familyName}`
          : profile.displayName;
      const imageUrl =
        photos && photos.length > 0 ? photos[0].value : undefined;
      const user = await this.authService.validateOAuthUser({
        provider: 'GOOGLE',
        providerId: id,
        email: primaryEmail.value,
        name: fullName,
        image: imageUrl,
      });
      done(undefined, user);
    } catch (error) {
      done(error as Error, undefined);
    }
  }
}
