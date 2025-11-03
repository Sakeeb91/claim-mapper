/**
 * Application Route Constants
 */

export const ROUTES = {
  HOME: '/',
  EXPLORE: '/explore',
  SEARCH: '/search',
  COLLABORATE: '/collaborate',
  EDITOR: '/editor',
  CLAIMS: '/claims',
  EVIDENCE: '/evidence',
  REASONING: '/reasoning',
  GRAPH: '/graph',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    RESET_PASSWORD: '/auth/reset-password',
  },
} as const;

export const API_ROUTES = {
  CLAIMS: '/api/claims',
  EVIDENCE: '/api/evidence',
  REASONING: '/api/reasoning',
  GRAPH: '/api/graph',
  SEARCH: '/api/search',
} as const;
