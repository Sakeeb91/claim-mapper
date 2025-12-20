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

  // Graph limits
  GRAPH_MAX_NODES: 1000,
  GRAPH_MAX_LINKS: 5000,
  GRAPH_MAX_DEPTH: 5,
  GRAPH_DEFAULT_DEPTH: 2,
  GRAPH_CACHE_TTL: 600, // 10 minutes in seconds
  GRAPH_LABEL_MAX_LENGTH: 100,

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

  // Evidence-specific limits
  EVIDENCE_CACHE_TTL: 300, // 5 minutes in seconds
  EVIDENCE_MAX_ANNOTATIONS: 50,
  EVIDENCE_MAX_RELATIONSHIPS: 20,

  // Reasoning-specific limits
  REASONING_CACHE_TTL: 600, // 10 minutes for ML responses
  REASONING_MAX_STEPS: 20,
  REASONING_MIN_STEPS: 2,
  REASONING_STEP_MAX_LENGTH: 1000,
  REASONING_ML_TIMEOUT: 30000, // 30 seconds for ML calls
  REASONING_MAX_TAGS: 10,
  REASONING_MAX_COMPLEXITY_DEPTH: 5,
} as const;

export const EVIDENCE_TYPES = [
  'empirical',
  'statistical',
  'testimonial',
  'expert',
  'documented',
  'anecdotal',
] as const;

export const EVIDENCE_SOURCE_TYPES = [
  'document',
  'url',
  'database',
  'survey',
  'interview',
  'observation',
] as const;

export const VERIFICATION_STATUSES = [
  'unverified',
  'verified',
  'disputed',
  'retracted',
] as const;

export const EVIDENCE_ERROR_MESSAGES = {
  NOT_FOUND: 'Evidence not found',
  ACCESS_DENIED: 'Access denied to this evidence',
  PROJECT_MISMATCH: 'Evidence does not belong to the specified project',
  CLAIM_NOT_FOUND: 'One or more claims not found',
  ALREADY_VERIFIED: 'Evidence is already verified',
  CANNOT_MODIFY_RETRACTED: 'Cannot modify retracted evidence',
  MAX_ANNOTATIONS_REACHED: 'Maximum number of annotations reached',
  MAX_RELATIONSHIPS_REACHED: 'Maximum number of relationships reached',
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

export const REASONING_TYPES = [
  'deductive',
  'inductive',
  'abductive',
  'analogical',
  'causal',
  'statistical',
] as const;

export const REASONING_STEP_TYPES = [
  'premise',
  'inference',
  'conclusion',
  'assumption',
  'observation',
] as const;

export const REASONING_STATUSES = [
  'draft',
  'review',
  'validated',
  'published',
  'archived',
] as const;

export const REASONING_COMPLEXITY_LEVELS = [
  'simple',
  'intermediate',
  'complex',
  'advanced',
] as const;

export const REASONING_ERROR_MESSAGES = {
  NOT_FOUND: 'Reasoning chain not found',
  ACCESS_DENIED: 'Access denied to this reasoning chain',
  PROJECT_MISMATCH: 'Reasoning chain does not belong to the specified project',
  CLAIM_NOT_FOUND: 'Associated claim not found',
  INVALID_STEPS: 'Invalid or insufficient reasoning steps provided',
  ML_SERVICE_UNAVAILABLE: 'ML service is currently unavailable',
  ML_REQUEST_FAILED: 'ML service request failed',
  ML_RATE_LIMITED: 'ML service rate limit exceeded',
  CANNOT_MODIFY_ARCHIVED: 'Cannot modify archived reasoning chain',
  CANNOT_MODIFY_PUBLISHED: 'Cannot modify published reasoning chain',
  MAX_STEPS_EXCEEDED: 'Maximum number of reasoning steps exceeded',
  VALIDATION_FAILED: 'Reasoning validation failed',
} as const;
