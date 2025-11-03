/**
 * Validation Constants
 */

export const CLAIM_VALIDATION = {
  MIN_LENGTH: 10,
  MAX_LENGTH: 5000,
  MIN_CONFIDENCE: 0,
  MAX_CONFIDENCE: 1,
} as const;

export const EVIDENCE_VALIDATION = {
  MIN_LENGTH: 10,
  MAX_LENGTH: 10000,
  MAX_SOURCES: 10,
} as const;

export const SEARCH_VALIDATION = {
  MIN_QUERY_LENGTH: 2,
  MAX_QUERY_LENGTH: 200,
  MAX_RESULTS: 100,
  DEFAULT_PAGE_SIZE: 20,
} as const;

export const USER_VALIDATION = {
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 30,
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
} as const;

export const FILE_VALIDATION = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['application/pdf', 'text/plain', 'application/json'],
} as const;
