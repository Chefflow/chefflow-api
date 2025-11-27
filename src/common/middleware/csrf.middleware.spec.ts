import { CsrfMiddleware } from './csrf.middleware';
import { Request, Response, NextFunction } from 'express';
import { ForbiddenException } from '@nestjs/common';

describe('CsrfMiddleware', () => {
  let middleware: CsrfMiddleware;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    middleware = new CsrfMiddleware();
    req = {
      cookies: {},
      get: jest.fn(),
      method: 'GET',
    };
    res = {
      cookie: jest.fn(),
    };
    next = jest.fn();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should set XSRF-TOKEN cookie if missing', () => {
    middleware.use(req as Request, res as Response, next);
    expect(res.cookie).toHaveBeenCalledWith(
      'XSRF-TOKEN',
      expect.any(String),
      expect.objectContaining({
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
      }),
    );
    expect(next).toHaveBeenCalled();
  });

  it('should handle undefined cookies gracefully', () => {
    req.cookies = undefined;
    middleware.use(req as Request, res as Response, next);
    // Should set a new cookie because none exists
    expect(res.cookie).toHaveBeenCalledWith(
      'XSRF-TOKEN',
      expect.any(String),
      expect.objectContaining({
        httpOnly: false,
      }),
    );
    expect(next).toHaveBeenCalled();
  });

  it('should not set cookie if already present', () => {
    req.cookies!['XSRF-TOKEN'] = 'existing-token';
    middleware.use(req as Request, res as Response, next);
    expect(res.cookie).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('should pass for safe methods (GET)', () => {
    req.method = 'GET';
    middleware.use(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it('should throw ForbiddenException if header is missing for POST', () => {
    req.method = 'POST';
    req.cookies!['XSRF-TOKEN'] = 'token';
    (req.get as jest.Mock).mockReturnValue(undefined);

    expect(() => {
      middleware.use(req as Request, res as Response, next);
    }).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if tokens mismatch', () => {
    req.method = 'POST';
    req.cookies!['XSRF-TOKEN'] = 'token1';
    (req.get as jest.Mock).mockReturnValue('token2');

    expect(() => {
      middleware.use(req as Request, res as Response, next);
    }).toThrow(ForbiddenException);
  });

  it('should pass if tokens match for POST', () => {
    req.method = 'POST';
    req.cookies!['XSRF-TOKEN'] = 'valid-token';
    (req.get as jest.Mock).mockReturnValue('valid-token');

    middleware.use(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
  });
});
