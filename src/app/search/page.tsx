'use client';

import React, { useState, useEffect, Suspense } from 'react';
import {
  Search as SearchIcon,
  Filter,
  Save,
  TrendingUp,
  X,
  Sparkles,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { useRouter, useSearchParams } from 'next/navigation';
import { UniversalSearchBar } from '@/components/search/UniversalSearchBar';
import { SearchFilters } from '@/components/search/SearchFilters';
import { SearchResults } from '@/components/search/SearchResults';
import { SavedSearches } from '@/components/search/SavedSearches';
import { useSearch, useSemanticSearch, useSavedSearches } from '@/hooks/useSearch';
import { useSearchStore } from '@/store/searchStore';
import { SearchQuery, SearchResult, SavedSearch } from '@/types/search';
import { SearchService } from '@/services/searchApi';
import { logger } from '@/utils/logger';
import { LOG_COMPONENTS, LOG_ACTIONS } from '@/constants/logging';

// Create child logger for search page
const searchLogger = logger.child({ component: LOG_COMPONENTS.SEARCH_PAGE });

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Local state
  const [showFilters, setShowFilters] = useState(false);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [showSemanticResults, setShowSemanticResults] = useState(false);
  const [saveSearchDialog, setSaveSearchDialog] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [saveSearchDescription, setSaveSearchDescription] = useState('');

  // Store state
  const {
    query,
    viewMode,
    suggestions,
    setQuery,
    setViewMode,
    reset
  } = useSearchStore();

  // Hooks
  const {
    results,
    facets,
    loading,
    error,
    totalCount,
    hasMore,
    search,
    refineSearch,
    loadMore,
    saveSearch: saveCurrentSearch
  } = useSearch({
    enableSemanticSearch: true,
    enableGeospatialSearch: true,
    trackAnalytics: true
  });

  const {
    semanticResults,
    loading: semanticLoading,
    searchSemantic,
    getSimilarContent
  } = useSemanticSearch();

  const {
    savedSearches,
    deleteSearch,
    updateSearch
  } = useSavedSearches();

  // URL parameters handling
  useEffect(() => {
    const queryParam = searchParams.get('q');
    const typeParam = searchParams.get('type');
    const filtersParam = searchParams.get('filters');

    if (queryParam && queryParam !== query.text) {
      let searchQuery: SearchQuery = {
        text: queryParam,
        filters: query.filters,
        sortBy: 'relevance',
        sortOrder: 'desc',
        page: 1,
        limit: 20
      };

      // Apply URL filters
      if (typeParam) {
        searchQuery.filters.types = typeParam.split(',') as any[];
      }

      if (filtersParam) {
        try {
          const urlFilters = JSON.parse(decodeURIComponent(filtersParam));
          searchQuery.filters = { ...searchQuery.filters, ...urlFilters };
        } catch (e) {
          searchLogger.warn('Failed to parse URL filters', {
            action: LOG_ACTIONS.FILTER,
            error: e instanceof Error ? e : String(e),
            filtersParam,
          });
        }
      }

      search(searchQuery);
    }
  }, [searchParams]);

  // Update URL when search changes
  const updateURL = (searchQuery: SearchQuery) => {
    const params = new URLSearchParams();
    
    if (searchQuery.text) {
      params.set('q', searchQuery.text);
    }
    
    if (searchQuery.filters.types.length > 0) {
      params.set('type', searchQuery.filters.types.join(','));
    }
    
    // Only include non-default filters in URL
    const hasCustomFilters = 
      searchQuery.filters.tags.length > 0 ||
      searchQuery.filters.authors.length > 0 ||
      searchQuery.filters.sources.length > 0 ||
      searchQuery.filters.dateRange !== null ||
      searchQuery.filters.confidenceRange[0] > 0 ||
      searchQuery.filters.confidenceRange[1] < 100;
      
    if (hasCustomFilters) {
      params.set('filters', encodeURIComponent(JSON.stringify(searchQuery.filters)));
    }

    const newURL = params.toString() ? `?${params.toString()}` : '/search';
    router.replace(newURL, { scroll: false });
  };

  // Handlers
  const handleSearch = async (searchQuery: SearchQuery) => {
    await search(searchQuery);
    updateURL(searchQuery);
    
    // Also trigger semantic search if enabled
    if (useSearchStore.getState().semanticEnabled && searchQuery.text.length > 5) {
      setShowSemanticResults(true);
      await searchSemantic(searchQuery.text, {
        contentTypes: searchQuery.filters.types.length > 0 ? searchQuery.filters.types : ['claim', 'evidence', 'reasoning'],
        limit: 10,
        threshold: 0.6
      });
    }
  };

  const handleFiltersChange = (filters: any) => {
    refineSearch(filters);
    const newQuery = { ...query, filters };
    updateURL(newQuery);
  };

  const handleResultClick = async (result: SearchResult) => {
    // Track click analytics
    // Navigate to result detail
    switch (result.type) {
      case 'claim':
        router.push(`/claims/${result.id}`);
        break;
      case 'evidence':
        router.push(`/evidence/${result.id}`);
        break;
      case 'reasoning':
        router.push(`/reasoning/${result.id}`);
        break;
      case 'project':
        router.push(`/projects/${result.id}`);
        break;
    }
  };

  const handleSaveSearch = async () => {
    if (!saveSearchName.trim() || !query.text.trim()) return;

    try {
      await saveCurrentSearch(saveSearchName, saveSearchDescription);
      setSaveSearchDialog(false);
      setSaveSearchName('');
      setSaveSearchDescription('');
    } catch (error) {
      searchLogger.error('Failed to save search', {
        action: LOG_ACTIONS.SAVE,
        error: error instanceof Error ? error : String(error),
        searchName: saveSearchName,
      });
    }
  };

  const handleLoadSavedSearch = (savedSearch: SavedSearch) => {
    search(savedSearch.query);
    updateURL(savedSearch.query);
    setShowSavedSearches(false);
  };

  const handleExportResults = async () => {
    try {
      const blob = await SearchService.exportResults(query, 'json');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `search-results-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      searchLogger.error('Export failed', {
        action: LOG_ACTIONS.EXPORT,
        error: error instanceof Error ? error : String(error),
        resultCount: results.length,
      });
    }
  };

  const getSimilarResults = async (result: SearchResult) => {
    try {
      const similar = await getSimilarContent(result.id, result.type);
      // Handle similar results display
      searchLogger.debug('Similar results retrieved', {
        action: LOG_ACTIONS.FIND_SIMILAR,
        resultId: result.id,
        resultType: result.type,
        similarCount: similar?.length ?? 0,
      });
    } catch (error) {
      searchLogger.error('Failed to get similar results', {
        action: LOG_ACTIONS.FIND_SIMILAR,
        error: error instanceof Error ? error : String(error),
        resultId: result.id,
        resultType: result.type,
      });
    }
  };

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar - Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 border-r border-border overflow-hidden"
          >
            <div className="w-80 h-full overflow-y-auto">
              <div className="sticky top-0 bg-background border-b border-border p-4 z-10">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium text-sm">Search Filters</h2>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="p-1 hover:bg-accent rounded transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="p-4">
                <SearchFilters
                  filters={query.filters}
                  facets={facets}
                  onFiltersChange={handleFiltersChange}
                  onReset={() => {
                    reset();
                    router.replace('/search');
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b border-border bg-background">
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              {/* Search Bar */}
              <div className="mb-4">
                <UniversalSearchBar
                  query={query.text}
                  onQueryChange={setQuery}
                  onSearch={handleSearch}
                  suggestions={suggestions}
                  loading={loading}
                  placeholder="Search claims, evidence, reasoning chains, and projects..."
                  showFilters={true}
                  showSemanticToggle={true}
                />
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={clsx(
                      "flex items-center space-x-2 px-3 py-1.5 text-sm rounded-md border transition-colors",
                      showFilters ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                    )}
                  >
                    <Filter className="h-4 w-4" />
                    <span>Filters</span>
                  </button>

                  <button
                    onClick={() => setShowSavedSearches(!showSavedSearches)}
                    className={clsx(
                      "flex items-center space-x-2 px-3 py-1.5 text-sm rounded-md border transition-colors",
                      showSavedSearches ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                    )}
                  >
                    <Save className="h-4 w-4" />
                    <span>Saved</span>
                  </button>

                  <button
                    onClick={() => setShowSemanticResults(!showSemanticResults)}
                    className={clsx(
                      "flex items-center space-x-2 px-3 py-1.5 text-sm rounded-md border transition-colors",
                      showSemanticResults ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
                      semanticResults.length === 0 && "opacity-50 cursor-not-allowed"
                    )}
                    disabled={semanticResults.length === 0}
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Semantic ({semanticResults.length})</span>
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  {query.text && results.length > 0 && (
                    <button
                      onClick={() => setSaveSearchDialog(true)}
                      className="flex items-center space-x-2 px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent transition-colors"
                    >
                      <Save className="h-3 w-3" />
                      <span>Save Search</span>
                    </button>
                  )}

                  {results.length > 0 && (
                    <button
                      onClick={handleExportResults}
                      className="flex items-center space-x-2 px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent transition-colors"
                    >
                      <Download className="h-3 w-3" />
                      <span>Export</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-6">
            {/* Saved Searches View */}
            {showSavedSearches ? (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-2">Saved Searches</h2>
                  <p className="text-muted-foreground text-sm">
                    Manage and run your saved search queries.
                  </p>
                </div>
                
                <SavedSearches
                  searches={savedSearches}
                  onSearchSelect={handleLoadSavedSearch}
                  onSearchDelete={deleteSearch}
                  onSearchUpdate={(search) => updateSearch({ id: search.id, updates: search })}
                  currentUserId="current-user" // Replace with actual user ID
                />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Semantic Results */}
                <AnimatePresence>
                  {showSemanticResults && semanticResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <Sparkles className="h-4 w-4 text-purple-600" />
                          <h3 className="font-medium text-sm">Semantic Search Results</h3>
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                            {semanticResults.length} similar
                          </span>
                        </div>
                        <button
                          onClick={() => setShowSemanticResults(false)}
                          className="p-1 hover:bg-white/50 rounded transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <SearchResults
                        results={semanticResults}
                        query={query}
                        totalCount={semanticResults.length}
                        loading={semanticLoading}
                        onResultClick={handleResultClick}
                        onPageChange={() => {}}
                        onSortChange={() => {}}
                        viewMode="list"
                        onViewModeChange={() => {}}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Main Search Results */}
                {query.text ? (
                  <div>
                    <SearchResults
                      results={results}
                      query={query}
                      totalCount={totalCount}
                      loading={loading}
                      onResultClick={handleResultClick}
                      onPageChange={(page) => {
                        const newQuery = { ...query, page };
                        search(newQuery);
                        updateURL(newQuery);
                      }}
                      onSortChange={(sortBy, sortOrder) => {
                        const newQuery = { ...query, sortBy: sortBy as any, sortOrder, page: 1 };
                        search(newQuery);
                        updateURL(newQuery);
                      }}
                      viewMode={viewMode}
                      onViewModeChange={setViewMode}
                    />

                    {error && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600 text-sm">{error}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Empty State */
                  <div className="text-center py-12">
                    <div className="max-w-md mx-auto">
                      <div className="mb-6">
                        <div className="w-20 h-20 mx-auto bg-muted rounded-full flex items-center justify-center">
                          <SearchIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      </div>
                      
                      <h2 className="text-xl font-semibold mb-3">Search Knowledge Base</h2>
                      <p className="text-muted-foreground mb-6">
                        Find claims, evidence, reasoning chains, and projects across your knowledge base.
                        Use advanced filters and semantic search for better results.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                        <div className="p-4 border border-border rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            <span className="font-medium text-sm">Smart Search</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Use natural language queries and semantic search to find related content.
                          </p>
                        </div>

                        <div className="p-4 border border-border rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <Filter className="h-4 w-4 text-primary" />
                            <span className="font-medium text-sm">Advanced Filters</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Filter by content type, confidence level, date range, and more.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Search Dialog */}
      <AnimatePresence>
        {saveSearchDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-background border border-border rounded-lg p-6 w-full max-w-md mx-4"
            >
              <h3 className="text-lg font-semibold mb-4">Save Search</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={saveSearchName}
                    onChange={(e) => setSaveSearchName(e.target.value)}
                    placeholder="Enter search name"
                    className="w-full px-3 py-2 border border-input rounded-md focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    autoFocus
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Description (optional)</label>
                  <textarea
                    value={saveSearchDescription}
                    onChange={(e) => setSaveSearchDescription(e.target.value)}
                    placeholder="Describe this search"
                    className="w-full px-3 py-2 border border-input rounded-md focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none"
                    rows={3}
                  />
                </div>

                <div className="bg-muted rounded-md p-3">
                  <div className="text-xs font-medium mb-1">Query:</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    "{query.text}"
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setSaveSearchDialog(false)}
                  className="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSearch}
                  disabled={!saveSearchName.trim()}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}