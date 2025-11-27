import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const csrfCookieName = 'XSRF-TOKEN';
    const csrfHeaderName = 'X-XSRF-TOKEN';

    // 1. Generate CSRF token if it doesn't exist in cookie
    if (!req.cookies || !req.cookies[csrfCookieName]) {
      const token = crypto.randomBytes(32).toString('hex');
      res.cookie(csrfCookieName, token, {
        httpOnly: false, // Must be accessible by JS
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      });
      // If it's a safe method, we can proceed after setting the cookie
      // But we still need to verify if the user sends a mutation request
    }

    // 2. Validate CSRF token for unsafe methods
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (!safeMethods.includes(req.method)) {
      const tokenFromCookie = req.cookies ? req.cookies[csrfCookieName] : null;
      const tokenFromHeader = req.get(csrfHeaderName);

      if (
        !tokenFromCookie ||
        !tokenFromHeader ||
        tokenFromCookie !== tokenFromHeader
      ) {
        throw new ForbiddenException('Invalid CSRF token');
      }
    }

    next();
  }
}
