/**
 * API Type Definitions
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: ApiMetadata;
}

export interface ApiError {
  code: number;
  message: string;
  details?: Record<string, any>;
}

export interface ApiMetadata {
  timestamp: string;
  requestId: string;
  version: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: Pagination;
}

export interface Pagination {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface SearchParams {
  query: string;
  filters?: Record<string, any>;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  facets?: Record<string, FacetResult>;
}

export interface FacetResult {
  name: string;
  values: Array<{
    value: string;
    count: number;
  }>;
}
