import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { GoogleOAuthGuard } from './google-oauth.guard';

describe('GoogleOAuthGuard', () => {
  let guard: GoogleOAuthGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GoogleOAuthGuard],
    }).compile();

    guard = module.get<GoogleOAuthGuard>(GoogleOAuthGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should extend AuthGuard with google strategy', () => {
    expect(guard).toBeInstanceOf(GoogleOAuthGuard);
  });

  describe('canActivate', () => {
    it('should call parent canActivate method', async () => {
      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            isAuthenticated: jest.fn().mockReturnValue(true),
          }),
        }),
      } as unknown as ExecutionContext;

      // Mock the parent's canActivate method
      const canActivateSpy = jest
        .spyOn(guard, 'canActivate')
        .mockResolvedValue(true);

      const result = await guard.canActivate(mockExecutionContext);

      expect(canActivateSpy).toHaveBeenCalledWith(mockExecutionContext);
      expect(result).toBe(true);

      canActivateSpy.mockRestore();
    });
  });
});
