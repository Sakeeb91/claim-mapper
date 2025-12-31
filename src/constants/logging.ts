/**
 * Logging Constants
 *
 * Centralized definitions for log components and actions
 * to ensure consistency across the application.
 */

/**
 * Component identifiers for structured logging
 */
export const LOG_COMPONENTS = {
  // Services
  WEBSOCKET: 'WebSocket',
  API: 'API',
  ML_API: 'MLApi',
  SEARCH_API: 'SearchAPI',
  GRAPH_API: 'GraphAPI',
  CLAIMS_API: 'ClaimsAPI',

  // Stores
  APP_STORE: 'AppStore',
  SEARCH_STORE: 'SearchStore',

  // Hooks
  SEARCH_HOOK: 'useSearch',
  WEBSOCKET_HOOK: 'useWebSocket',
  LOCAL_STORAGE_HOOK: 'useLocalStorage',
  COVERAGE_HOOK: 'useCoverage',

  // Components
  KNOWLEDGE_GRAPH: 'KnowledgeGraph',
  SEARCH_BAR: 'UniversalSearchBar',
  COLLABORATIVE_EDITOR: 'CollaborativeEditor',
  VERSION_HISTORY: 'VersionHistory',
  CONFLICT_RESOLVER: 'ConflictResolver',
  VALIDATION_PANEL: 'ValidationPanel',

  // Pages
  SEARCH_PAGE: 'SearchPage',
  COLLABORATE_PAGE: 'CollaboratePage',
  EXPLORE_PAGE: 'ExplorePage',
  EDITOR_PAGE: 'EditorPage',

  // Providers
  APP_PROVIDERS: 'AppProviders',
} as const;

/**
 * Common action identifiers for structured logging
 */
export const LOG_ACTIONS = {
  // Connection actions
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  RECONNECT: 'reconnect',
  RECONNECT_ATTEMPT: 'reconnect_attempt',
  CONNECTION_ERROR: 'connection_error',

  // CRUD actions
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  SAVE: 'save',

  // Search actions
  SEARCH: 'search',
  SEMANTIC_SEARCH: 'semantic_search',
  FILTER: 'filter',
  EXPORT: 'export',

  // Collaboration actions
  JOIN: 'join',
  LEAVE: 'leave',
  EDIT_START: 'edit_start',
  EDIT_END: 'edit_end',
  CURSOR_UPDATE: 'cursor_update',
  COMMENT: 'comment',

  // ML actions
  EXTRACT_CLAIMS: 'extract_claims',
  ANALYZE_CLAIM: 'analyze_claim',
  FIND_SIMILAR: 'find_similar',
  HEALTH_CHECK: 'health_check',

  // Validation actions
  VALIDATE: 'validate',
  SUBMIT: 'submit',
  RESOLVE: 'resolve',

  // Storage actions
  STORAGE_READ: 'storage_read',
  STORAGE_WRITE: 'storage_write',
  STORAGE_ERROR: 'storage_error',

  // State actions
  INITIALIZE: 'initialize',
  RESET: 'reset',
  REVERT: 'revert',
} as const;

export type LogComponent = (typeof LOG_COMPONENTS)[keyof typeof LOG_COMPONENTS];
export type LogAction = (typeof LOG_ACTIONS)[keyof typeof LOG_ACTIONS];
