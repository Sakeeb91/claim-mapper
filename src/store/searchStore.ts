'use client';

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { 
  SearchQuery, 
  AdvancedSearchFilters, 
  SearchResult, 
  SearchFacets, 
  SearchSuggestion, 
  SavedSearch,
  SearchPreferences,
  SearchableContentType
} from '@/types/search';

interface SearchState {
  // Current search state
  query: SearchQuery;
  results: SearchResult[];
  facets: SearchFacets;
  suggestions: SearchSuggestion[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  searchId: string | null;
  
  // Semantic search
  semanticResults: SearchResult[];
  semanticLoading: boolean;
  semanticEnabled: boolean;
  
  // Saved searches
  savedSearches: SavedSearch[];
  
  // Search history
  searchHistory: string[];
  
  // User preferences
  preferences: SearchPreferences;
  
  // View state
  viewMode: 'list' | 'grid' | 'graph';
  selectedResultId: string | null;
  
  // Actions
  setQuery: (query: string) => void;
  setFilters: (filters: Partial<AdvancedSearchFilters>) => void;
  setSortBy: (sortBy: string, order: 'asc' | 'desc') => void;
  setPage: (page: number) => void;
  setResults: (results: SearchResult[], totalCount: number, hasMore: boolean) => void;
  setFacets: (facets: SearchFacets) => void;
  setSuggestions: (suggestions: SearchSuggestion[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSemanticResults: (results: SearchResult[]) => void;
  setSemanticLoading: (loading: boolean) => void;
  toggleSemanticSearch: () => void;
  setViewMode: (mode: 'list' | 'grid' | 'graph') => void;
  setSelectedResult: (id: string | null) => void;
  
  // Search actions
  reset: () => void;
  addToHistory: (query: string) => void;
  clearHistory: () => void;
  
  // Saved searches
  saveSearch: (search: SavedSearch) => void;
  updateSavedSearch: (id: string, updates: Partial<SavedSearch>) => void;
  deleteSavedSearch: (id: string) => void;
  
  // Preferences
  updatePreferences: (preferences: Partial<SearchPreferences>) => void;
}

const defaultFilters: AdvancedSearchFilters = {
  types: [],
  dateRange: null,
  confidenceRange: [0, 100],
  tags: [],
  authors: [],
  sources: [],
  status: [],
  hasEvidence: null,
  hasReasoning: null,
  location: null,
  customFields: {},
};

const defaultQuery: SearchQuery = {
  text: '',
  filters: defaultFilters,
  sortBy: 'relevance',
  sortOrder: 'desc',
  page: 1,
  limit: 20,
};

const defaultFacets: SearchFacets = {
  types: [],
  authors: [],
  tags: [],
  sources: [],
  dateRanges: [],
  confidenceRanges: {
    min: 0,
    max: 100,
    selectedMin: 0,
    selectedMax: 100,
    histogram: [],
  },
  locations: [],
};

const defaultPreferences: SearchPreferences = {
  userId: '',
  defaultSort: 'relevance',
  defaultLimit: 20,
  preferredTypes: [],
  autoCompleteEnabled: true,
  semanticSearchEnabled: true,
  geospatialSearchEnabled: true,
  saveSearchHistory: true,
  recentSearches: [],
  favoriteFilters: [],
  updatedAt: new Date(),
};

export const useSearchStore = create<SearchState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state
        query: defaultQuery,
        results: [],
        facets: defaultFacets,
        suggestions: [],
        loading: false,
        error: null,
        totalCount: 0,
        hasMore: false,
        searchId: null,
        
        semanticResults: [],
        semanticLoading: false,
        semanticEnabled: false,
        
        savedSearches: [],
        searchHistory: [],
        preferences: defaultPreferences,
        
        viewMode: 'list',
        selectedResultId: null,
        
        // Actions
        setQuery: (text: string) => {
          set((state) => {
            state.query.text = text;
            state.query.page = 1; // Reset to first page on new query
          });
        },
        
        setFilters: (filters: Partial<AdvancedSearchFilters>) => {
          set((state) => {
            state.query.filters = { ...state.query.filters, ...filters };
            state.query.page = 1; // Reset to first page on filter change
          });
        },
        
        setSortBy: (sortBy: string, order: 'asc' | 'desc') => {
          set((state) => {
            state.query.sortBy = sortBy as any;
            state.query.sortOrder = order;
            state.query.page = 1;
          });
        },
        
        setPage: (page: number) => {
          set((state) => {
            state.query.page = page;
          });
        },
        
        setResults: (results: SearchResult[], totalCount: number, hasMore: boolean) => {
          set((state) => {
            state.results = results;
            state.totalCount = totalCount;
            state.hasMore = hasMore;
          });
        },
        
        setFacets: (facets: SearchFacets) => {
          set((state) => {
            state.facets = facets;
          });
        },
        
        setSuggestions: (suggestions: SearchSuggestion[]) => {
          set((state) => {
            state.suggestions = suggestions;
          });
        },
        
        setLoading: (loading: boolean) => {
          set((state) => {
            state.loading = loading;
          });
        },
        
        setError: (error: string | null) => {
          set((state) => {
            state.error = error;
          });
        },
        
        setSemanticResults: (results: SearchResult[]) => {
          set((state) => {
            state.semanticResults = results;
          });
        },
        
        setSemanticLoading: (loading: boolean) => {
          set((state) => {
            state.semanticLoading = loading;
          });
        },
        
        toggleSemanticSearch: () => {
          set((state) => {
            state.semanticEnabled = !state.semanticEnabled;
          });
        },
        
        setViewMode: (mode: 'list' | 'grid' | 'graph') => {
          set((state) => {
            state.viewMode = mode;
          });
        },
        
        setSelectedResult: (id: string | null) => {
          set((state) => {
            state.selectedResultId = id;
          });
        },
        
        reset: () => {
          set((state) => {
            state.query = { ...defaultQuery };
            state.results = [];
            state.facets = { ...defaultFacets };
            state.suggestions = [];
            state.loading = false;
            state.error = null;
            state.totalCount = 0;
            state.hasMore = false;
            state.searchId = null;
            state.semanticResults = [];
            state.selectedResultId = null;
          });
        },
        
        addToHistory: (query: string) => {
          set((state) => {
            if (query.trim() && !state.searchHistory.includes(query)) {
              state.searchHistory = [query, ...state.searchHistory.slice(0, 9)]; // Keep last 10
            }
          });
        },
        
        clearHistory: () => {
          set((state) => {
            state.searchHistory = [];
          });
        },
        
        saveSearch: (search: SavedSearch) => {
          set((state) => {
            const existingIndex = state.savedSearches.findIndex(s => s.id === search.id);
            if (existingIndex >= 0) {
              state.savedSearches[existingIndex] = search;
            } else {
              state.savedSearches.push(search);
            }
          });
        },
        
        updateSavedSearch: (id: string, updates: Partial<SavedSearch>) => {
          set((state) => {
            const index = state.savedSearches.findIndex(s => s.id === id);
            if (index >= 0) {
              state.savedSearches[index] = { ...state.savedSearches[index], ...updates };
            }
          });
        },
        
        deleteSavedSearch: (id: string) => {
          set((state) => {
            state.savedSearches = state.savedSearches.filter(s => s.id !== id);
          });
        },
        
        updatePreferences: (preferences: Partial<SearchPreferences>) => {
          set((state) => {
            state.preferences = { ...state.preferences, ...preferences, updatedAt: new Date() };
          });
        },
      }))
    ),
    {
      name: 'search-store',
    }
  )
);

// Selectors
export const useSearchQuery = () => useSearchStore((state) => state.query);
export const useSearchResults = () => useSearchStore((state) => ({
  results: state.results,
  totalCount: state.totalCount,
  hasMore: state.hasMore,
  loading: state.loading,
  error: state.error,
}));
export const useSearchFacets = () => useSearchStore((state) => state.facets);
export const useSearchSuggestions = () => useSearchStore((state) => state.suggestions);
export const useSemanticSearch = () => useSearchStore((state) => ({
  results: state.semanticResults,
  loading: state.semanticLoading,
  enabled: state.semanticEnabled,
}));
export const useSavedSearches = () => useSearchStore((state) => state.savedSearches);
export const useSearchPreferences = () => useSearchStore((state) => state.preferences);
export const useSearchViewState = () => useSearchStore((state) => ({
  viewMode: state.viewMode,
  selectedResultId: state.selectedResultId,
}));