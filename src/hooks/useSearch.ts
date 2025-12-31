'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useSearchStore } from '@/store/searchStore';
import { SearchService, SearchUtils } from '@/services/searchApi';
import {
  SearchQuery,
  AdvancedSearchFilters,
  UseSearchOptions,
  UseSearchReturn,
  UseSemanticSearchReturn,
  UseSearchAnalyticsReturn,
  SemanticSearchRequest,
  SearchableContentType
} from '@/types/search';
import { useDebounce } from './useDebounce';
import { logger } from '@/utils/logger';
import { LOG_COMPONENTS, LOG_ACTIONS } from '@/constants/logging';

// Create child logger for search hook
const searchHookLogger = logger.child({ component: LOG_COMPONENTS.SEARCH_HOOK });

// Main search hook
export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
  const {
    enableSemanticSearch = true,
    enableGeospatialSearch = true,
    debounceMs = 300,
    cacheResults = true,
    trackAnalytics = true,
  } = options;

  const queryClient = useQueryClient();
  const {
    query,
    results,
    facets,
    suggestions,
    loading,
    error,
    totalCount,
    hasMore,
    setQuery,
    setFilters,
    setSortBy,
    setPage,
    setResults,
    setFacets,
    setSuggestions,
    setLoading,
    setError,
    addToHistory,
    reset,
    saveSearch: saveSearchToStore,
  } = useSearchStore();

  // Debounce search query
  const debouncedQuery = useDebounce(query.text, debounceMs);
  const searchIdRef = useRef<string | null>(null);

  // Main search query
  const searchQuery = useQuery(
    ['search', debouncedQuery, query.filters, query.sortBy, query.sortOrder, query.page],
    async () => {
      if (!debouncedQuery.trim()) {
        return { results: [], facets: null, totalCount: 0, hasMore: false };
      }

      setLoading(true);
      setError(null);

      try {
        const response = await SearchService.search(query);
        searchIdRef.current = response.searchId;
        
        // Track analytics
        if (trackAnalytics) {
          SearchService.trackSearch({
            searchId: response.searchId,
            query: debouncedQuery,
            resultsCount: response.totalCount,
            timestamp: new Date(),
          });
        }

        return {
          results: response.results,
          facets: response.facets,
          totalCount: response.totalCount,
          hasMore: response.hasMore,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Search failed';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    {
      enabled: debouncedQuery.trim().length >= 2,
      staleTime: cacheResults ? 5 * 60 * 1000 : 0, // 5 minutes
      cacheTime: cacheResults ? 10 * 60 * 1000 : 0, // 10 minutes
      onSuccess: (data) => {
        setResults(data.results, data.totalCount, data.hasMore);
        if (data.facets) {
          setFacets(data.facets);
        }
        if (debouncedQuery.trim()) {
          addToHistory(debouncedQuery);
        }
      },
      onError: (err) => {
        searchHookLogger.error('Search error', {
          action: LOG_ACTIONS.SEARCH,
          error: err instanceof Error ? err : String(err),
          query: debouncedQuery,
        });
      },
    }
  );

  // Suggestions query
  const suggestionsQuery = useQuery(
    ['suggestions', debouncedQuery],
    async () => {
      if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
        return { suggestions: [], recent: [] };
      }
      return SearchService.getSuggestions(debouncedQuery, 8);
    },
    {
      enabled: debouncedQuery.length >= 1,
      staleTime: 2 * 60 * 1000, // 2 minutes
      onSuccess: (data) => {
        setSuggestions(data.suggestions);
      },
    }
  );

  // Search mutation for immediate searches
  const searchMutation = useMutation(
    (searchQuery: SearchQuery) => SearchService.search(searchQuery),
    {
      onSuccess: (response) => {
        setResults(response.results, response.totalCount, response.hasMore);
        setFacets(response.facets);
        searchIdRef.current = response.searchId;
      },
      onError: (err) => {
        const errorMessage = err instanceof Error ? err.message : 'Search failed';
        setError(errorMessage);
      },
    }
  );

  // Save search mutation
  const saveSearchMutation = useMutation(
    (searchData: { name: string; description?: string }) =>
      SearchService.saveSearch({
        ...searchData,
        query,
        userId: 'current-user', // Replace with actual user ID
        isPublic: false,
        tags: [],
        lastUsed: new Date(),
        useCount: 1,
        resultsCount: totalCount,
      }),
    {
      onSuccess: (savedSearch) => {
        saveSearchToStore(savedSearch);
        queryClient.invalidateQueries(['savedSearches']);
      },
    }
  );

  // Search function
  const search = useCallback(
    async (searchInput: string | SearchQuery) => {
      let searchQuery: SearchQuery;
      
      if (typeof searchInput === 'string') {
        setQuery(searchInput);
        searchQuery = { ...query, text: searchInput };
      } else {
        searchQuery = searchInput;
        setQuery(searchQuery.text);
        setFilters(searchQuery.filters);
        setSortBy(searchQuery.sortBy, searchQuery.sortOrder);
        setPage(searchQuery.page);
      }

      // Trigger immediate search
      searchMutation.mutate(searchQuery);
    },
    [query, setQuery, setFilters, setSortBy, setPage, searchMutation]
  );

  // Refine search function
  const refineSearch = useCallback(
    (filters: Partial<AdvancedSearchFilters>) => {
      setFilters(filters);
      // Search will be triggered automatically by the query effect
    },
    [setFilters]
  );

  // Load more results
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    
    const nextPage = query.page + 1;
    setPage(nextPage);
    
    try {
      const response = await SearchService.search({ ...query, page: nextPage });
      setResults([...results, ...response.results], response.totalCount, response.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more results');
    }
  }, [hasMore, loading, query, results, setPage, setResults, setError]);

  // Save current search
  const saveSearch = useCallback(
    async (name: string, description?: string): Promise<void> => {
      if (!query.text.trim()) {
        throw new Error('Cannot save empty search');
      }
      await saveSearchMutation.mutateAsync({ name, description });
    },
    [query.text, saveSearchMutation]
  );

  return {
    query,
    results,
    facets,
    suggestions,
    loading: loading || searchQuery.isLoading || searchMutation.isLoading,
    error: error || (searchQuery.error as string) || (searchMutation.error as string),
    totalCount,
    hasMore,
    search,
    refineSearch,
    loadMore,
    reset,
    saveSearch,
  };
}

// Semantic search hook
export function useSemanticSearch(): UseSemanticSearchReturn {
  const {
    semanticResults,
    semanticLoading,
    semanticEnabled,
    setSemanticResults,
    setSemanticLoading,
  } = useSearchStore();

  const semanticSearchMutation = useMutation(
    (request: SemanticSearchRequest) => SearchService.semanticSearch(request),
    {
      onMutate: () => {
        setSemanticLoading(true);
      },
      onSuccess: (results) => {
        setSemanticResults(results);
        setSemanticLoading(false);
      },
      onError: (error) => {
        searchHookLogger.error('Semantic search error', {
          action: LOG_ACTIONS.SEMANTIC_SEARCH,
          error: error instanceof Error ? error : String(error),
        });
        setSemanticLoading(false);
      },
    }
  );

  const getSimilarContentMutation = useMutation(
    ({ contentId, contentType }: { contentId: string; contentType: SearchableContentType }) =>
      SearchService.getSimilarContent(contentId, contentType, 10)
  );

  const searchSemantic = useCallback(
    async (query: string, options: Partial<SemanticSearchRequest> = {}): Promise<void> => {
      if (!semanticEnabled) {
        throw new Error('Semantic search is not enabled');
      }

      const request: SemanticSearchRequest = {
        query,
        contentTypes: ['claim', 'evidence', 'reasoning'],
        limit: 10,
        threshold: 0.7,
        includeVector: false,
        ...options,
      };

      await semanticSearchMutation.mutateAsync(request);
    },
    [semanticEnabled, semanticSearchMutation]
  );

  const getSimilarContent = useCallback(
    async (contentId: string, contentType: SearchableContentType) => {
      const results = await getSimilarContentMutation.mutateAsync({ contentId, contentType });
      return results;
    },
    [getSimilarContentMutation]
  );

  return {
    semanticResults,
    loading: semanticLoading,
    error: semanticSearchMutation.error as string,
    searchSemantic,
    getSimilarContent,
  };
}

// Search analytics hook
export function useSearchAnalytics(): UseSearchAnalyticsReturn {
  const searchIdRef = useRef<string | null>(null);
  const analyticsData = useRef<{
    searchStartTime: number;
    clickedResults: string[];
    refinements: any[];
  }>({
    searchStartTime: 0,
    clickedResults: [],
    refinements: [],
  });

  const trackAnalyticsMutation = useMutation(
    (analytics: any) => SearchService.trackSearch(analytics)
  );

  const trackSearch = useCallback((query: string, resultsCount: number) => {
    analyticsData.current.searchStartTime = Date.now();
    analyticsData.current.clickedResults = [];
    analyticsData.current.refinements = [];
    
    // Track basic search event
    trackAnalyticsMutation.mutate({
      query,
      resultsCount,
      timestamp: new Date(),
    });
  }, [trackAnalyticsMutation]);

  const trackResultClick = useCallback((resultId: string, position: number) => {
    analyticsData.current.clickedResults.push(resultId);
    
    trackAnalyticsMutation.mutate({
      searchId: searchIdRef.current,
      clickedResults: [resultId],
      clickPosition: position,
      timestamp: new Date(),
    });
  }, [trackAnalyticsMutation]);

  const trackSearchRefinement = useCallback((action: string, details: Record<string, any>) => {
    const refinement = {
      timestamp: new Date(),
      action,
      details,
    };
    
    analyticsData.current.refinements.push(refinement);
    
    trackAnalyticsMutation.mutate({
      searchId: searchIdRef.current,
      refinements: [refinement],
    });
  }, [trackAnalyticsMutation]);

  const getSearchInsights = useCallback(async () => {
    return SearchService.getSearchAnalytics(7);
  }, []);

  return {
    trackSearch,
    trackResultClick,
    trackSearchRefinement,
    getSearchInsights,
  };
}

// Utility hooks
export function useSearchHistory() {
  const { searchHistory, clearHistory } = useSearchStore();
  
  return {
    history: searchHistory,
    clearHistory,
  };
}

export function useSavedSearches() {
  const { savedSearches, deleteSavedSearch, updateSavedSearch } = useSearchStore();
  const queryClient = useQueryClient();

  const savedSearchesQuery = useQuery(
    ['savedSearches'],
    () => SearchService.getSavedSearches(),
    {
      onSuccess: (searches) => {
        searches.forEach(search => {
          useSearchStore.getState().saveSearch(search);
        });
      },
    }
  );

  const deleteMutation = useMutation(
    (searchId: string) => SearchService.deleteSavedSearch(searchId),
    {
      onSuccess: (_, searchId) => {
        deleteSavedSearch(searchId);
        queryClient.invalidateQueries(['savedSearches']);
      },
    }
  );

  const updateMutation = useMutation(
    ({ id, updates }: { id: string; updates: any }) =>
      SearchService.updateSavedSearch(id, updates),
    {
      onSuccess: (updatedSearch) => {
        updateSavedSearch(updatedSearch.id, updatedSearch);
        queryClient.invalidateQueries(['savedSearches']);
      },
    }
  );

  return {
    savedSearches,
    loading: savedSearchesQuery.isLoading,
    deleteSearch: deleteMutation.mutate,
    updateSearch: updateMutation.mutate,
    refresh: () => queryClient.invalidateQueries(['savedSearches']),
  };
}