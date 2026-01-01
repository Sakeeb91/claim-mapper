/**
 * Backend API Constants Export
 */

export * from './errors';
export * from './status';
export * from './validation';

// Environment constants
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';
export const IS_DEVELOPMENT = NODE_ENV === 'development';
export const IS_TEST = NODE_ENV === 'test';

// Security constants
export const SECURITY_CONFIG = {
  JWT_MIN_SECRET_LENGTH: 32,
  BCRYPT_ROUNDS: 12,
  SESSION_SECRET_MIN_LENGTH: 32,
} as const;

/**
 * Validates JWT secret configuration.
 * - In production: JWT_SECRET is required and must be at least 32 characters
 * - In development: Allows fallback to a generated development secret
 * - Throws Error if validation fails (fail-fast pattern)
 */
function validateJwtSecret(): string {
  const jwtSecret = process.env.JWT_SECRET;

  // Production: JWT_SECRET is mandatory
  if (IS_PRODUCTION && !jwtSecret) {
    throw new Error(
      'CRITICAL: JWT_SECRET environment variable must be set in production. ' +
        'Generate a secure secret with: openssl rand -base64 48'
    );
  }

  // Validate minimum length if secret is provided
  if (jwtSecret && jwtSecret.length < SECURITY_CONFIG.JWT_MIN_SECRET_LENGTH) {
    throw new Error(
      `CRITICAL: JWT_SECRET must be at least ${SECURITY_CONFIG.JWT_MIN_SECRET_LENGTH} characters long. ` +
        `Current length: ${jwtSecret.length}. Generate a secure secret with: openssl rand -base64 48`
    );
  }

  // Development fallback with timestamp to ensure uniqueness per server start
  if (!jwtSecret && IS_DEVELOPMENT) {
    const devSecret = `dev-secret-DO-NOT-USE-IN-PRODUCTION-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    // Only log warning if not in test mode to avoid noisy test output
    if (!IS_TEST) {
      console.warn(
        '⚠️  WARNING: Using generated development JWT secret. ' +
          'Set JWT_SECRET environment variable for production.'
      );
    }
    return devSecret;
  }

  // Test environment fallback
  if (!jwtSecret && IS_TEST) {
    return 'test-secret-for-automated-testing-purposes-only-32chars';
  }

  return jwtSecret!;
}

// Service configuration
export const SERVICE_CONFIG = {
  PORT: parseInt(process.env.PORT || '8000', 10),
  API_PREFIX: '/api',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  JWT_SECRET: validateJwtSecret(),
  JWT_EXPIRY: '24h',
  REFRESH_TOKEN_EXPIRY: '7d',
} as const;

// Database configuration
export const DB_CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/claim-mapper',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  CONNECTION_TIMEOUT: 30000,
  MAX_POOL_SIZE: 10,
} as const;

// Cache configuration
export const CACHE_CONFIG = {
  DEFAULT_TTL: 3600, // 1 hour in seconds
  SESSION_TTL: 86400, // 24 hours
  SEARCH_RESULTS_TTL: 300, // 5 minutes
  GRAPH_DATA_TTL: 600, // 10 minutes
} as const;

// Logging configuration
export const LOG_CONFIG = {
  LEVEL: process.env.LOG_LEVEL || (IS_PRODUCTION ? 'info' : 'debug'),
  FORMAT: IS_PRODUCTION ? 'json' : 'simple',
  MAX_FILES: 10,
  MAX_SIZE: '20m',
} as const;
