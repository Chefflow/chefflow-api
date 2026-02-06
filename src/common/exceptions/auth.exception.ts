import { HttpException, HttpStatus } from '@nestjs/common';

export type AuthErrorCode =
  | 'USERNAME_TAKEN'
  | 'EMAIL_EXISTS'
  | 'INVALID_CREDENTIALS'
  | 'RATE_LIMIT'
  | 'SERVER_ERROR'
  | 'VALIDATION_ERROR';

export interface AuthErrorResponse {
  code: AuthErrorCode;
  message: string;
  field?: string;
  suggestions?: string[];
  retryAfter?: number;
}

export class AuthException extends HttpException {
  constructor(
    private readonly errorCode: AuthErrorCode,
    message: string,
    statusCode: HttpStatus,
    private readonly field?: string,
    private readonly suggestions?: string[],
    private readonly retryAfter?: number,
  ) {
    super(
      {
        code: errorCode,
        message,
        field,
        suggestions,
        retryAfter,
      } as AuthErrorResponse,
      statusCode,
    );
  }

  getErrorCode(): AuthErrorCode {
    return this.errorCode;
  }

  getField(): string | undefined {
    return this.field;
  }

  getSuggestions(): string[] | undefined {
    return this.suggestions;
  }

  getRetryAfter(): number | undefined {
    return this.retryAfter;
  }
}

// Specific auth exception classes
export class UsernameTakenException extends AuthException {
  constructor(suggestions?: string[]) {
    super(
      'USERNAME_TAKEN',
      'Username is already taken',
      HttpStatus.CONFLICT,
      'username',
      suggestions,
    );
  }
}

export class EmailExistsException extends AuthException {
  constructor() {
    super(
      'EMAIL_EXISTS',
      'Email is already registered',
      HttpStatus.CONFLICT,
      'email',
      ['Try logging in instead', 'Use a different email address'],
    );
  }
}

export class InvalidCredentialsException extends AuthException {
  constructor() {
    super(
      'INVALID_CREDENTIALS',
      'Invalid username or password',
      HttpStatus.UNAUTHORIZED,
      undefined,
      ['Check your username and password', 'Reset your password if forgotten'],
    );
  }
}

export class RateLimitException extends AuthException {
  constructor(retryAfter: number) {
    super(
      'RATE_LIMIT',
      'Too many requests. Please try again later',
      HttpStatus.TOO_MANY_REQUESTS,
      undefined,
      [`Wait ${retryAfter} seconds before trying again`],
      retryAfter,
    );
  }
}

export class AuthServerErrorException extends AuthException {
  constructor(message = 'An unexpected error occurred') {
    super('SERVER_ERROR', message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export class ValidationErrorException extends AuthException {
  constructor(message: string, field?: string) {
    super('VALIDATION_ERROR', message, HttpStatus.BAD_REQUEST, field);
  }
}
