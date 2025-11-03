/**
 * API Configuration Constants
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
export const ML_API_URL = process.env.NEXT_PUBLIC_ML_API_URL || 'http://localhost:8002';
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8001';

export const API_ENDPOINTS = {
  CLAIMS: '/api/claims',
  EVIDENCE: '/api/evidence',
  REASONING: '/api/reasoning',
  GRAPH: '/api/graph',
  SEARCH: '/api/search',
  USERS: '/api/users',
  AUTH: '/api/auth',
} as const;

export const ML_ENDPOINTS = {
  EXTRACT: '/extract',
  ANALYZE: '/analyze',
  MINE_ARGUMENTS: '/mine-arguments',
  ENTITIES: '/entities',
  VALIDATE: '/validate',
  REASONING_GENERATE: '/reasoning/generate',
  REASONING_ANALYZE: '/reasoning/analyze',
  SIMILARITY: '/similarity',
} as const;

export const API_TIMEOUT = 30000; // 30 seconds
export const RETRY_ATTEMPTS = 3;
export const RETRY_DELAY = 1000; // 1 second
