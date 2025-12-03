import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

interface RequestWithCsrfToken extends Request {
  csrfToken?: string;
}

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: RequestWithCsrfToken, res: Response, next: NextFunction) {
    const csrfCookieName = 'CSRF-TOKEN';
    const csrfHeaderName = 'X-CSRF-Token';

    // Always generate/read token for all requests
    if (!req.cookies || !req.cookies[csrfCookieName]) {
      const token = crypto.randomBytes(32).toString('hex');
      res.cookie(csrfCookieName, token, {
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      });
      req.csrfToken = token;
    } else {
      req.csrfToken = req.cookies[csrfCookieName];
    }

    // Skip CSRF validation for safe methods
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
      return next();
    }

    // Skip CSRF validation for /auth/csrf endpoint (used to get token)
    if (req.path === '/auth/csrf') {
      return next();
    }

    // Validate CSRF token for all other non-safe methods
    const tokenFromCookie = req.cookies ? req.cookies[csrfCookieName] : null;
    const tokenFromHeader = req.get(csrfHeaderName);

    if (
      !tokenFromCookie ||
      !tokenFromHeader ||
      tokenFromCookie !== tokenFromHeader
    ) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    next();
  }
}
