import { Public, IS_PUBLIC_KEY } from './public.decorator';

describe('Public Decorator', () => {
  it('should be defined', () => {
    expect(Public).toBeDefined();
    expect(IS_PUBLIC_KEY).toBeDefined();
  });

  it('should have correct IS_PUBLIC_KEY value', () => {
    expect(IS_PUBLIC_KEY).toBe('isPublic');
  });

  it('should return a decorator function', () => {
    const decorator = Public();

    expect(typeof decorator).toBe('function');
  });

  it('should be callable without errors', () => {
    expect(() => Public()).not.toThrow();
  });

  describe('Decorator application', () => {
    it('should not throw when applied to a method', () => {
      expect(() => {
        class TestController {
          @Public()
          publicMethod() {
            return 'public';
          }
        }
        new TestController();
      }).not.toThrow();
    });

    it('should not throw when applied to a class', () => {
      expect(() => {
        @Public()
        class TestController {
          method() {
            return 'test';
          }
        }
        new TestController();
      }).not.toThrow();
    });

    it('should allow method execution after decoration', () => {
      class TestController {
        @Public()
        publicMethod() {
          return 'public';
        }
      }

      const controller = new TestController();
      expect(controller.publicMethod()).toBe('public');
    });

    it('should allow class instantiation after decoration', () => {
      @Public()
      class TestController {
        method() {
          return 'test';
        }
      }

      const controller = new TestController();
      expect(controller.method()).toBe('test');
    });
  });
});
