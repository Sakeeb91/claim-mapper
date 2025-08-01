// Advanced search and filtering types
export interface SearchQuery {
  text: string;
  filters: AdvancedSearchFilters;
  sortBy: 'relevance' | 'date' | 'confidence' | 'popularity';
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

export interface AdvancedSearchFilters {
  types: SearchableContentType[];
  dateRange: {
    start?: Date;
    end?: Date;
  } | null;
  confidenceRange: [number, number];
  tags: string[];
  authors: string[];
  sources: string[];
  status: ContentStatus[];
  hasEvidence: boolean | null;
  hasReasoning: boolean | null;
  location: GeospatialFilter | null;
  customFields: Record<string, any>;
}

export type SearchableContentType = 'claim' | 'evidence' | 'reasoning' | 'project';
export type ContentStatus = 'draft' | 'published' | 'validated' | 'disputed' | 'archived';

export interface GeospatialFilter {
  center: [number, number]; // [lat, lng]
  radius: number; // in km
  boundingBox?: {
    northeast: [number, number];
    southwest: [number, number];
  };
}

export interface SearchSuggestion {
  id: string;
  type: 'recent' | 'popular' | 'autocomplete' | 'entity';
  text: string;
  displayText: string;
  relevance: number;
  metadata?: {
    count?: number;
    category?: string;
    entityType?: SearchableContentType;
  };
}

export interface SearchResult<T = any> {
  id: string;
  type: SearchableContentType;
  title: string;
  snippet: string;
  fullContent: string;
  relevanceScore: number;
  semanticScore?: number;
  highlights: SearchHighlight[];
  data: T;
  metadata: {
    author?: string;
    createdAt: Date;
    updatedAt: Date;
    confidence?: number;
    tags: string[];
    source?: string;
    location?: [number, number];
    projectId: string;
    projectName: string;
  };
}

export interface SearchHighlight {
  field: string;
  fragments: string[];
  matchCount: number;
}

export interface SearchFacets {
  types: FacetItem[];
  authors: FacetItem[];
  tags: FacetItem[];
  sources: FacetItem[];
  dateRanges: DateRangeFacet[];
  confidenceRanges: RangeFacet[];
  locations: LocationFacet[];
}

export interface FacetItem {
  value: string;
  count: number;
  selected: boolean;
}

export interface DateRangeFacet {
  label: string;
  start: Date;
  end: Date;
  count: number;
  selected: boolean;
}

export interface RangeFacet {
  min: number;
  max: number;
  selectedMin: number;
  selectedMax: number;
  histogram: { value: number; count: number }[];
}

export interface LocationFacet {
  region: string;
  center: [number, number];
  count: number;
  selected: boolean;
}

export interface SearchResponse<T = SearchResult[]> {
  results: T;
  facets: SearchFacets;
  totalCount: number;
  executionTimeMs: number;
  searchId: string;
  hasMore: boolean;
  nextPage?: number;
  suggestions?: SearchSuggestion[];
}

export interface SemanticSearchRequest {
  query: string;
  contentTypes: SearchableContentType[];
  limit: number;
  threshold: number;
  includeVector?: boolean;
}

export interface SemanticSimilarity {
  score: number;
  rank: number;
  explanation?: string;
}

export interface SavedSearch {
  id: string;
  name: string;
  description?: string;
  query: SearchQuery;
  userId: string;
  isPublic: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  lastUsed: Date;
  useCount: number;
  resultsCount?: number;
}

export interface SearchAnalytics {
  searchId: string;
  query: string;
  userId?: string;
  resultsCount: number;
  clickedResults: string[];
  timeSpentMs: number;
  refinements: {
    timestamp: Date;
    action: 'filter_added' | 'filter_removed' | 'sort_changed' | 'query_modified';
    details: Record<string, any>;
  }[];
  timestamp: Date;
}

export interface SearchPreferences {
  userId: string;
  defaultSort: 'relevance' | 'date' | 'confidence';
  defaultLimit: number;
  preferredTypes: SearchableContentType[];
  autoCompleteEnabled: boolean;
  semanticSearchEnabled: boolean;
  geospatialSearchEnabled: boolean;
  saveSearchHistory: boolean;
  recentSearches: string[];
  favoriteFilters: Partial<AdvancedSearchFilters>[];
  updatedAt: Date;
}

// Component props
export interface UniversalSearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: (query: SearchQuery) => void;
  suggestions: SearchSuggestion[];
  loading: boolean;
  placeholder?: string;
  showFilters?: boolean;
  showSemanticToggle?: boolean;
  className?: string;
}

export interface SearchFiltersProps {
  filters: AdvancedSearchFilters;
  facets: SearchFacets;
  onFiltersChange: (filters: AdvancedSearchFilters) => void;
  onReset: () => void;
  className?: string;
}

export interface SearchResultsProps {
  results: SearchResult[];
  query: SearchQuery;
  totalCount: number;
  loading: boolean;
  onResultClick: (result: SearchResult) => void;
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: string, order: 'asc' | 'desc') => void;
  viewMode: 'list' | 'grid' | 'graph';
  onViewModeChange: (mode: 'list' | 'grid' | 'graph') => void;
  className?: string;
}

export interface SavedSearchesProps {
  searches: SavedSearch[];
  onSearchSelect: (search: SavedSearch) => void;
  onSearchDelete: (searchId: string) => void;
  onSearchUpdate: (search: SavedSearch) => void;
  currentUserId: string;
  className?: string;
}

// Search hooks
export interface UseSearchOptions {
  enableSemanticSearch?: boolean;
  enableGeospatialSearch?: boolean;
  debounceMs?: number;
  cacheResults?: boolean;
  trackAnalytics?: boolean;
}

export interface UseSearchReturn {
  query: SearchQuery;
  results: SearchResult[];
  facets: SearchFacets;
  suggestions: SearchSuggestion[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  search: (query: string | SearchQuery) => Promise<void>;
  refineSearch: (filters: Partial<AdvancedSearchFilters>) => void;
  loadMore: () => Promise<void>;
  reset: () => void;
  saveSearch: (name: string, description?: string) => Promise<void>;
}

export interface UseSemanticSearchReturn {
  semanticResults: SearchResult[];
  loading: boolean;
  error: string | null;
  searchSemantic: (query: string, options?: Partial<SemanticSearchRequest>) => Promise<void>;
  getSimilarContent: (contentId: string, contentType: SearchableContentType) => Promise<SearchResult[]>;
}

export interface UseSearchAnalyticsReturn {
  trackSearch: (query: string, resultsCount: number) => void;
  trackResultClick: (resultId: string, position: number) => void;
  trackSearchRefinement: (action: string, details: Record<string, any>) => void;
  getSearchInsights: () => Promise<any>;
}
