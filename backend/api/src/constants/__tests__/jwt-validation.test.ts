/**
 * Tests for JWT Secret Validation
 *
 * Tests the security validation logic for JWT_SECRET environment variable.
 * These tests verify fail-fast behavior in production and proper fallbacks in development.
 *
 * Note: We use require() instead of import because jest.resetModules() only works
 * with CommonJS require. ES modules are cached at parse time, before jest.resetModules()
 * can clear the cache. This is the recommended pattern for testing module initialization.
 */

/* eslint-disable @typescript-eslint/no-var-requires */

describe('JWT Secret Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules to ensure fresh import of constants
    jest.resetModules();
    // Clone environment to avoid pollution between tests
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Production Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should throw error when JWT_SECRET is not provided in production', () => {
      delete process.env.JWT_SECRET;

      expect(() => {
        require('../index');
      }).toThrow('CRITICAL: JWT_SECRET environment variable must be set in production');
    });

    it('should throw error when JWT_SECRET is empty string in production', () => {
      process.env.JWT_SECRET = '';

      expect(() => {
        require('../index');
      }).toThrow('CRITICAL: JWT_SECRET environment variable must be set in production');
    });

    it('should throw error when JWT_SECRET is less than 32 characters', () => {
      process.env.JWT_SECRET = 'short-secret-only-25-chars';

      expect(() => {
        require('../index');
      }).toThrow('CRITICAL: JWT_SECRET must be at least 32 characters long');
    });

    it('should accept valid JWT_SECRET of 32+ characters', () => {
      process.env.JWT_SECRET = 'this-is-a-valid-secret-that-is-at-least-32-characters-long';

      const { SERVICE_CONFIG } = require('../index');

      expect(SERVICE_CONFIG.JWT_SECRET).toBe('this-is-a-valid-secret-that-is-at-least-32-characters-long');
    });

    it('should include secret length in error message', () => {
      process.env.JWT_SECRET = '15-char-secret!';

      expect(() => {
        require('../index');
      }).toThrow('Current length: 15');
    });
  });

  describe('Development Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should generate fallback secret when JWT_SECRET not provided', () => {
      delete process.env.JWT_SECRET;

      const { SERVICE_CONFIG } = require('../index');

      expect(SERVICE_CONFIG.JWT_SECRET).toMatch(/^dev-secret-DO-NOT-USE-IN-PRODUCTION-/);
    });

    it('should still validate minimum length when JWT_SECRET is provided', () => {
      process.env.JWT_SECRET = 'short';

      expect(() => {
        require('../index');
      }).toThrow('CRITICAL: JWT_SECRET must be at least 32 characters long');
    });

    it('should accept valid JWT_SECRET in development', () => {
      process.env.JWT_SECRET = 'development-secret-with-32-or-more-characters';

      const { SERVICE_CONFIG } = require('../index');

      expect(SERVICE_CONFIG.JWT_SECRET).toBe('development-secret-with-32-or-more-characters');
    });

    it('should generate unique fallback secrets per import', () => {
      delete process.env.JWT_SECRET;

      const { SERVICE_CONFIG: config1 } = require('../index');
      jest.resetModules();
      process.env.NODE_ENV = 'development';
      const { SERVICE_CONFIG: config2 } = require('../index');

      // Different instances should have different timestamps
      expect(config1.JWT_SECRET).not.toBe(config2.JWT_SECRET);
    });
  });

  describe('Test Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'test';
    });

    it('should use test fallback secret when JWT_SECRET not provided', () => {
      delete process.env.JWT_SECRET;

      const { SERVICE_CONFIG } = require('../index');

      expect(SERVICE_CONFIG.JWT_SECRET).toBe('test-secret-for-automated-testing-purposes-only-32chars');
    });

    it('should still validate minimum length when JWT_SECRET is provided', () => {
      process.env.JWT_SECRET = 'short';

      expect(() => {
        require('../index');
      }).toThrow('CRITICAL: JWT_SECRET must be at least 32 characters long');
    });
  });

  describe('SECURITY_CONFIG', () => {
    it('should export JWT_MIN_SECRET_LENGTH constant', () => {
      // Clear JWT_SECRET to use test fallback (avoids short secret from CI env)
      delete process.env.JWT_SECRET;
      process.env.NODE_ENV = 'test';

      const { SECURITY_CONFIG } = require('../index');

      expect(SECURITY_CONFIG.JWT_MIN_SECRET_LENGTH).toBe(32);
    });

    it('should export BCRYPT_ROUNDS constant', () => {
      // Clear JWT_SECRET to use test fallback (avoids short secret from CI env)
      delete process.env.JWT_SECRET;
      process.env.NODE_ENV = 'test';

      const { SECURITY_CONFIG } = require('../index');

      expect(SECURITY_CONFIG.BCRYPT_ROUNDS).toBe(12);
    });
  });
});
