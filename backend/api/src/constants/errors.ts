/**
 * Error Message Constants
 */

export const ERROR_MESSAGES = {
  // Authentication errors
  UNAUTHORIZED: 'Authentication required',
  INVALID_CREDENTIALS: 'Invalid email or password',
  TOKEN_EXPIRED: 'Token has expired',
  TOKEN_INVALID: 'Invalid authentication token',

  // Authorization errors
  FORBIDDEN: 'You do not have permission to perform this action',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',

  // Validation errors
  INVALID_INPUT: 'Invalid input provided',
  MISSING_REQUIRED_FIELD: 'Required field is missing',
  INVALID_FORMAT: 'Invalid format',

  // Resource errors
  NOT_FOUND: 'Resource not found',
  ALREADY_EXISTS: 'Resource already exists',
  CONFLICT: 'Resource conflict',

  // Database errors
  DATABASE_ERROR: 'Database operation failed',
  CONNECTION_ERROR: 'Database connection error',

  // General errors
  INTERNAL_SERVER_ERROR: 'Internal server error',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',

  // Email errors
  EMAIL_SEND_FAILED: 'Failed to send email',
  EMAIL_SERVICE_UNAVAILABLE: 'Email service is currently unavailable',
  EMAIL_INVALID_ADDRESS: 'Invalid email address',
  EMAIL_QUEUE_FAILED: 'Failed to queue email',

  // Password reset errors
  RESET_TOKEN_EXPIRED: 'Password reset token has expired',
  RESET_TOKEN_INVALID: 'Invalid password reset token',
  PASSWORD_RESET_FAILED: 'Failed to reset password',
} as const;

export const ERROR_CODES = {
  // Authentication (1000-1999)
  UNAUTHORIZED: 1000,
  INVALID_CREDENTIALS: 1001,
  TOKEN_EXPIRED: 1002,
  TOKEN_INVALID: 1003,

  // Authorization (2000-2999)
  FORBIDDEN: 2000,
  INSUFFICIENT_PERMISSIONS: 2001,

  // Validation (3000-3999)
  INVALID_INPUT: 3000,
  MISSING_REQUIRED_FIELD: 3001,
  INVALID_FORMAT: 3002,

  // Resource (4000-4999)
  NOT_FOUND: 4000,
  ALREADY_EXISTS: 4001,
  CONFLICT: 4002,

  // Database (5000-5999)
  DATABASE_ERROR: 5000,
  CONNECTION_ERROR: 5001,

  // General (9000-9999)
  INTERNAL_SERVER_ERROR: 9000,
  SERVICE_UNAVAILABLE: 9001,
  RATE_LIMIT_EXCEEDED: 9002,

  // Email (6000-6999)
  EMAIL_SEND_FAILED: 6000,
  EMAIL_SERVICE_UNAVAILABLE: 6001,
  EMAIL_INVALID_ADDRESS: 6002,
  EMAIL_QUEUE_FAILED: 6003,

  // Password Reset (7000-7999)
  RESET_TOKEN_EXPIRED: 7000,
  RESET_TOKEN_INVALID: 7001,
  PASSWORD_RESET_FAILED: 7002,
} as const;
