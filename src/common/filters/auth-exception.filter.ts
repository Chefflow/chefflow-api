import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthException, AuthErrorResponse } from '../exceptions/auth.exception';
import { ThrottlerException } from '@nestjs/throttler';

@Catch(AuthException, ThrottlerException, HttpException)
export class AuthExceptionFilter implements ExceptionFilter {
  catch(
    exception: AuthException | ThrottlerException | HttpException,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Handle AuthException
    if (exception instanceof AuthException) {
      const status = exception.getStatus();
      const errorResponse = exception.getResponse() as AuthErrorResponse;

      return response.status(status).json(errorResponse);
    }

    // Handle ThrottlerException (rate limiting)
    if (exception instanceof ThrottlerException) {
      const retryAfter = 60; // Default retry after 60 seconds
      const errorResponse: AuthErrorResponse = {
        code: 'RATE_LIMIT',
        message: 'Too many requests. Please try again later',
        retryAfter,
        suggestions: [`Wait ${retryAfter} seconds before trying again`],
      };

      return response.status(HttpStatus.TOO_MANY_REQUESTS).json(errorResponse);
    }

    // Handle other HttpExceptions (fallback)
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'code' in exceptionResponse
    ) {
      return response.status(status).json(exceptionResponse);
    }

    if (
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
    ) {
      const messages = Array.isArray((exceptionResponse as any).message)
        ? (exceptionResponse as any).message
        : [(exceptionResponse as any).message];

      const errorResponse: AuthErrorResponse = {
        code: 'VALIDATION_ERROR',
        message: messages[0] || 'Validation failed',
        suggestions: messages.length > 1 ? messages.slice(1) : undefined,
      };

      return response.status(status).json(errorResponse);
    }

    // Generic error response
    const errorResponse: AuthErrorResponse = {
      code: 'SERVER_ERROR',
      message: exception.message || 'An unexpected error occurred',
    };

    return response.status(status).json(errorResponse);
  }
}
