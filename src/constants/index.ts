/**
 * Centralized Constants Export
 */

export * from './api';
export * from './graph';
export * from './routes';
export * from './validation';

// General application constants
export const APP_NAME = 'Claim Mapper';
export const APP_VERSION = '0.1.0';
export const APP_DESCRIPTION = 'Interactive Knowledge Graph Visualization System for Claims, Evidence, and Reasoning Chains';

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'claim-mapper-auth-token',
  USER_PREFERENCES: 'claim-mapper-preferences',
  RECENT_SEARCHES: 'claim-mapper-recent-searches',
  GRAPH_STATE: 'claim-mapper-graph-state',
} as const;

export const TIMEOUTS = {
  DEBOUNCE: 300,
  THROTTLE: 1000,
  AUTO_SAVE: 5000,
  SESSION: 3600000, // 1 hour
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;
