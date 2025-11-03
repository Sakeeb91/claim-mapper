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

// Service configuration
export const SERVICE_CONFIG = {
  PORT: parseInt(process.env.PORT || '8000', 10),
  API_PREFIX: '/api',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
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
