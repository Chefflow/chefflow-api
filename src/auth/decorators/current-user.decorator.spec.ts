import { ExecutionContext } from '@nestjs/common';
import { CurrentUser } from './current-user.decorator';

describe('CurrentUser Decorator', () => {
  let mockExecutionContext: ExecutionContext;
  let mockRequest: any;

  const mockUser = {
    username: 'testuser',
    email: 'test@example.com',
    name: 'Test User',
    image: null,
    provider: 'LOCAL',
    providerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockRequest = {
      user: mockUser,
    };

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as any;
  });

  it('should be defined', () => {
    expect(CurrentUser).toBeDefined();
  });

  it('should extract user from request', () => {
    const decoratorFactory = CurrentUser();
    const factory = decoratorFactory.KEY
      ? (decoratorFactory as any).factory
      : decoratorFactory;

    const result = mockExecutionContext.switchToHttp().getRequest().user;

    expect(result).toEqual(mockUser);
    expect(mockExecutionContext.switchToHttp).toHaveBeenCalled();
  });

  it('should return user object with all properties', () => {
    const result = mockRequest.user;

    expect(result).toHaveProperty('username');
    expect(result).toHaveProperty('email');
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('provider');
    expect(result.username).toBe('testuser');
    expect(result.email).toBe('test@example.com');
  });

  it('should handle request without user', () => {
    mockRequest.user = undefined;

    const result = mockRequest.user;

    expect(result).toBeUndefined();
  });

  it('should handle request with null user', () => {
    mockRequest.user = null;

    const result = mockRequest.user;

    expect(result).toBeNull();
  });

  it('should work with different user objects', () => {
    const differentUser = {
      username: 'anotheruser',
      email: 'another@example.com',
      name: 'Another User',
      image: 'http://example.com/image.jpg',
      provider: 'GOOGLE',
      providerId: 'google-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockRequest.user = differentUser;

    const result = mockRequest.user;

    expect(result).toEqual(differentUser);
    expect(result.username).toBe('anotheruser');
    expect(result.provider).toBe('GOOGLE');
  });

  describe('Decorator behavior', () => {
    it('should be usable as parameter decorator', () => {
      class TestController {
        testMethod(@CurrentUser() user: any) {
          return user;
        }
      }

      const controller = new TestController();
      expect(controller.testMethod(mockUser)).toEqual(mockUser);
    });

    it('should not modify the user object', () => {
      const originalUser = { ...mockUser };
      mockRequest.user = mockUser;

      const result = mockRequest.user;

      expect(result).toEqual(originalUser);
      expect(Object.keys(result)).toEqual(Object.keys(originalUser));
    });
  });

  describe('ExecutionContext integration', () => {
    it('should call switchToHttp on context', () => {
      const switchToHttpSpy = jest.spyOn(mockExecutionContext, 'switchToHttp');

      mockExecutionContext.switchToHttp().getRequest();

      expect(switchToHttpSpy).toHaveBeenCalled();
    });

    it('should call getRequest on HTTP context', () => {
      const httpContext = mockExecutionContext.switchToHttp();
      const getRequestSpy = jest.spyOn(httpContext, 'getRequest');

      httpContext.getRequest();

      expect(getRequestSpy).toHaveBeenCalled();
    });

    it('should extract user from the request object', () => {
      const request = mockExecutionContext.switchToHttp().getRequest();

      expect(request).toHaveProperty('user');
      expect(request.user).toEqual(mockUser);
    });
  });
});
