/**
 * Server-side Validation Constants
 */

export const VALIDATION_LIMITS = {
  // Claim limits
  CLAIM_MIN_LENGTH: 10,
  CLAIM_MAX_LENGTH: 5000,
  CLAIM_MIN_CONFIDENCE: 0,
  CLAIM_MAX_CONFIDENCE: 1,

  // Evidence limits
  EVIDENCE_MIN_LENGTH: 10,
  EVIDENCE_MAX_LENGTH: 10000,
  EVIDENCE_MAX_SOURCES: 10,

  // Search limits
  SEARCH_MIN_QUERY: 2,
  SEARCH_MAX_QUERY: 200,
  SEARCH_MAX_RESULTS: 100,
  SEARCH_DEFAULT_PAGE_SIZE: 20,

  // User limits
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 30,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  EMAIL_MAX_LENGTH: 255,

  // File limits
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES_PER_UPLOAD: 5,

  // Rate limiting
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,

  // Pagination
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  USERNAME: /^[a-zA-Z0-9_-]{3,30}$/,
  URL: /^https?:\/\/.+/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
} as const;

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'application/json',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;
