import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

interface RequestWithCsrfToken extends Request {
  csrfToken?: string;
}

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: RequestWithCsrfToken, res: Response, next: NextFunction) {
    const csrfCookieName = 'XSRF-TOKEN';
    const csrfHeaderName = 'X-XSRF-TOKEN';

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
