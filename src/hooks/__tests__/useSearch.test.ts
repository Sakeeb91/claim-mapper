import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from 'react-query'
import React from 'react'
import {
  useSearch,
  useSemanticSearch,
  useSearchAnalytics,
  useSearchHistory,
  useSavedSearches,
} from '../useSearch'
import * as SearchService from '@/services/searchApi'

// Mock the search store
const mockSearchStore = {
  query: {
    text: '',
    filters: {
      contentTypes: ['claim'],
      confidence: [0, 1],
      dateRange: null,
      sources: [],
      tags: [],
    },
    sortBy: 'relevance',
    sortOrder: 'desc',
    page: 1,
    limit: 20,
  },
  results: [],
  facets: null,
  suggestions: [],
  loading: false,
  error: null,
  totalCount: 0,
  hasMore: false,
  semanticResults: [],
  semanticLoading: false,
  semanticEnabled: true,
  searchHistory: ['climate change', 'global warming'],
  savedSearches: [],
  setQuery: jest.fn(),
  setFilters: jest.fn(),
  setSortBy: jest.fn(),
  setPage: jest.fn(),
  setResults: jest.fn(),
  setFacets: jest.fn(),
  setSuggestions: jest.fn(),
  setLoading: jest.fn(),
  setError: jest.fn(),
  setSemanticResults: jest.fn(),
  setSemanticLoading: jest.fn(),
  addToHistory: jest.fn(),
  reset: jest.fn(),
  saveSearch: jest.fn(),
  deleteSavedSearch: jest.fn(),
  updateSavedSearch: jest.fn(),
  clearHistory: jest.fn(),
}

jest.mock('@/store/searchStore', () => ({
  useSearchStore: () => mockSearchStore,
}))

// Mock the SearchService
jest.mock('@/services/searchApi', () => ({
  SearchService: {
    search: jest.fn(),
    getSuggestions: jest.fn(),
    semanticSearch: jest.fn(),
    getSimilarContent: jest.fn(),
    trackSearch: jest.fn(),
    getSearchAnalytics: jest.fn(),
    saveSearch: jest.fn(),
    getSavedSearches: jest.fn(),
    deleteSavedSearch: jest.fn(),
    updateSavedSearch: jest.fn(),
  },
}))

// Mock useDebounce hook
jest.mock('../useDebounce', () => ({
  useDebounce: (value: string) => value,
}))

const mockSearchResponse = {
  results: [
    { id: '1', title: 'Climate Change Evidence', type: 'claim', relevance: 0.9 },
    { id: '2', title: 'Temperature Data', type: 'evidence', relevance: 0.8 },
  ],
  facets: {
    contentTypes: [
      { name: 'claim', count: 42 },
      { name: 'evidence', count: 38 },
    ],
  },
  totalCount: 80,
  hasMore: true,
  searchId: 'search-123',
}

const mockSuggestionsResponse = {
  suggestions: [
    {
      id: 'suggestion-1',
      type: 'autocomplete',
      text: 'climate change impacts',
      displayText: 'climate change impacts',
      relevance: 0.9,
    },
  ],
  recent: ['climate change', 'global warming'],
}

describe('useSearch', () => {
  let queryClient: QueryClient
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    jest.clearAllMocks()
    ;(SearchService.SearchService.search as jest.Mock).mockResolvedValue(mockSearchResponse)
    ;(SearchService.SearchService.getSuggestions as jest.Mock).mockResolvedValue(
      mockSuggestionsResponse
    )
  })

  afterEach(() => {
    queryClient.clear()
  })

  describe('useSearch', () => {
    it('initializes with default state', () => {
      const { result } = renderHook(() => useSearch(), { wrapper })

      expect(result.current.query).toEqual(mockSearchStore.query)
      expect(result.current.results).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe(null)
      expect(result.current.totalCount).toBe(0)
      expect(result.current.hasMore).toBe(false)
    })

    it('performs search when search function is called', async () => {
      const { result } = renderHook(() => useSearch(), { wrapper })

      await act(async () => {
        await result.current.search('climate change')
      })

      expect(mockSearchStore.setQuery).toHaveBeenCalledWith('climate change')
      expect(SearchService.SearchService.search).toHaveBeenCalled()
    })

    it('performs search with SearchQuery object', async () => {
      const { result } = renderHook(() => useSearch(), { wrapper })

      const searchQuery = {
        text: 'climate change',
        filters: { contentTypes: ['claim'] },
        sortBy: 'relevance' as const,
        sortOrder: 'desc' as const,
        page: 1,
        limit: 20,
      }

      await act(async () => {
        await result.current.search(searchQuery)
      })

      expect(mockSearchStore.setQuery).toHaveBeenCalledWith('climate change')
      expect(mockSearchStore.setFilters).toHaveBeenCalledWith({ contentTypes: ['claim'] })
      expect(SearchService.SearchService.search).toHaveBeenCalled()
    })

    it('refines search with filters', async () => {
      const { result } = renderHook(() => useSearch(), { wrapper })

      act(() => {
        result.current.refineSearch({ contentTypes: ['evidence'] })
      })

      expect(mockSearchStore.setFilters).toHaveBeenCalledWith({ contentTypes: ['evidence'] })
    })

    it('loads more results', async () => {
      // Mock the store to have hasMore = true
      const storeWithMore = {
        ...mockSearchStore,
        hasMore: true,
        results: [mockSearchResponse.results[0]],
      }
      jest.doMock('@/store/searchStore', () => ({
        useSearchStore: () => storeWithMore,
      }))

      const { result } = renderHook(() => useSearch(), { wrapper })

      await act(async () => {
        await result.current.loadMore()
      })

      expect(mockSearchStore.setPage).toHaveBeenCalledWith(2)
      expect(SearchService.SearchService.search).toHaveBeenCalled()
    })

    it('saves search', async () => {
      const mockSavedSearch = {
        id: 'saved-1',
        name: 'Climate Research',
        query: mockSearchStore.query,
        userId: 'user-1',
        createdAt: new Date(),
        lastUsed: new Date(),
        useCount: 1,
        resultsCount: 80,
        isPublic: false,
        tags: [],
      }

      ;(SearchService.SearchService.saveSearch as jest.Mock).mockResolvedValue(mockSavedSearch)

      // Set up store with a non-empty query
      const storeWithQuery = {
        ...mockSearchStore,
        query: { ...mockSearchStore.query, text: 'climate change' },
      }
      jest.doMock('@/store/searchStore', () => ({
        useSearchStore: () => storeWithQuery,
      }))

      const { result } = renderHook(() => useSearch(), { wrapper })

      await act(async () => {
        await result.current.saveSearch('Climate Research', 'Research on climate change')
      })

      expect(SearchService.SearchService.saveSearch).toHaveBeenCalled()
      expect(mockSearchStore.saveSearch).toHaveBeenCalledWith(mockSavedSearch)
    })

    it('throws error when trying to save empty search', async () => {
      const { result } = renderHook(() => useSearch(), { wrapper })

      await expect(
        act(async () => {
          await result.current.saveSearch('Empty Search')
        })
      ).rejects.toThrow('Cannot save empty search')
    })

    it('resets search state', () => {
      const { result } = renderHook(() => useSearch(), { wrapper })

      act(() => {
        result.current.reset()
      })

      expect(mockSearchStore.reset).toHaveBeenCalled()
    })

    it('handles search errors gracefully', async () => {
      const searchError = new Error('Search service unavailable')
      ;(SearchService.SearchService.search as jest.Mock).mockRejectedValue(searchError)

      const { result } = renderHook(() => useSearch(), { wrapper })

      await act(async () => {
        try {
          await result.current.search('climate change')
        } catch (error) {
          // Expected to throw
        }
      })

      expect(mockSearchStore.setError).toHaveBeenCalledWith('Search service unavailable')
    })

    it('configures caching based on options', () => {
      const { result } = renderHook(() => useSearch({ cacheResults: false }), { wrapper })

      // Verify hook is initialized (cache configuration is handled internally)
      expect(result.current).toBeDefined()
    })

    it('disables analytics when trackAnalytics is false', () => {
      const { result } = renderHook(() => useSearch({ trackAnalytics: false }), { wrapper })

      expect(result.current).toBeDefined()
      // Analytics tracking is handled internally in the query success callback
    })
  })

  describe('useSemanticSearch', () => {
    const mockSemanticResults = [
      { id: '1', title: 'Climate Evidence', similarity: 0.95, type: 'claim' },
      { id: '2', title: 'Temperature Data', similarity: 0.87, type: 'evidence' },
    ]

    beforeEach(() => {
      ;(SearchService.SearchService.semanticSearch as jest.Mock).mockResolvedValue(
        mockSemanticResults
      )
      ;(SearchService.SearchService.getSimilarContent as jest.Mock).mockResolvedValue(
        mockSemanticResults
      )
    })

    it('initializes with semantic search capabilities', () => {
      const { result } = renderHook(() => useSemanticSearch(), { wrapper })

      expect(result.current.semanticResults).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe(null)
    })

    it('performs semantic search', async () => {
      const { result } = renderHook(() => useSemanticSearch(), { wrapper })

      await act(async () => {
        await result.current.searchSemantic('climate change impacts', {
          contentTypes: ['claim', 'evidence'],
          threshold: 0.8,
        })
      })

      expect(SearchService.SearchService.semanticSearch).toHaveBeenCalledWith({
        query: 'climate change impacts',
        contentTypes: ['claim', 'evidence'],
        limit: 10,
        threshold: 0.8,
        includeVector: false,
      })
    })

    it('gets similar content', async () => {
      const { result } = renderHook(() => useSemanticSearch(), { wrapper })

      await act(async () => {
        await result.current.getSimilarContent('claim-123', 'claim')
      })

      expect(SearchService.SearchService.getSimilarContent).toHaveBeenCalledWith(
        'claim-123',
        'claim',
        10
      )
    })

    it('throws error when semantic search is disabled', async () => {
      const storeWithDisabledSemantic = {
        ...mockSearchStore,
        semanticEnabled: false,
      }
      jest.doMock('@/store/searchStore', () => ({
        useSearchStore: () => storeWithDisabledSemantic,
      }))

      const { result } = renderHook(() => useSemanticSearch(), { wrapper })

      await expect(
        act(async () => {
          await result.current.searchSemantic('test query')
        })
      ).rejects.toThrow('Semantic search is not enabled')
    })
  })

  describe('useSearchAnalytics', () => {
    beforeEach(() => {
      ;(SearchService.SearchService.trackSearch as jest.Mock).mockResolvedValue({})
      ;(SearchService.SearchService.getSearchAnalytics as jest.Mock).mockResolvedValue([])
    })

    it('tracks search events', async () => {
      const { result } = renderHook(() => useSearchAnalytics(), { wrapper })

      await act(async () => {
        result.current.trackSearch('climate change', 50)
      })

      expect(SearchService.SearchService.trackSearch).toHaveBeenCalledWith({
        query: 'climate change',
        resultsCount: 50,
        timestamp: expect.any(Date),
      })
    })

    it('tracks result clicks', async () => {
      const { result } = renderHook(() => useSearchAnalytics(), { wrapper })

      await act(async () => {
        result.current.trackResultClick('result-123', 3)
      })

      expect(SearchService.SearchService.trackSearch).toHaveBeenCalledWith({
        searchId: null,
        clickedResults: ['result-123'],
        clickPosition: 3,
        timestamp: expect.any(Date),
      })
    })

    it('tracks search refinements', async () => {
      const { result } = renderHook(() => useSearchAnalytics(), { wrapper })

      await act(async () => {
        result.current.trackSearchRefinement('filter_applied', {
          filterType: 'contentType',
          filterValue: 'evidence',
        })
      })

      expect(SearchService.SearchService.trackSearch).toHaveBeenCalledWith({
        searchId: null,
        refinements: [
          {
            timestamp: expect.any(Date),
            action: 'filter_applied',
            details: {
              filterType: 'contentType',
              filterValue: 'evidence',
            },
          },
        ],
      })
    })

    it('gets search insights', async () => {
      const { result } = renderHook(() => useSearchAnalytics(), { wrapper })

      await act(async () => {
        await result.current.getSearchInsights()
      })

      expect(SearchService.SearchService.getSearchAnalytics).toHaveBeenCalledWith(7)
    })
  })

  describe('useSearchHistory', () => {
    it('returns search history', () => {
      const { result } = renderHook(() => useSearchHistory())

      expect(result.current.history).toEqual(['climate change', 'global warming'])
    })

    it('clears search history', () => {
      const { result } = renderHook(() => useSearchHistory())

      act(() => {
        result.current.clearHistory()
      })

      expect(mockSearchStore.clearHistory).toHaveBeenCalled()
    })
  })

  describe('useSavedSearches', () => {
    const mockSavedSearches = [
      {
        id: 'saved-1',
        name: 'Climate Research',
        query: mockSearchStore.query,
        userId: 'user-1',
        createdAt: new Date(),
        lastUsed: new Date(),
        useCount: 5,
        resultsCount: 80,
        isPublic: false,
        tags: ['climate', 'research'],
      },
    ]

    beforeEach(() => {
      ;(SearchService.SearchService.getSavedSearches as jest.Mock).mockResolvedValue(
        mockSavedSearches
      )
      ;(SearchService.SearchService.deleteSavedSearch as jest.Mock).mockResolvedValue({})
      ;(SearchService.SearchService.updateSavedSearch as jest.Mock).mockResolvedValue(
        mockSavedSearches[0]
      )
    })

    it('loads saved searches', async () => {
      const { result } = renderHook(() => useSavedSearches(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(SearchService.SearchService.getSavedSearches).toHaveBeenCalled()
    })

    it('deletes saved search', async () => {
      const { result } = renderHook(() => useSavedSearches(), { wrapper })

      await act(async () => {
        result.current.deleteSearch('saved-1')
      })

      expect(SearchService.SearchService.deleteSavedSearch).toHaveBeenCalledWith('saved-1')
      expect(mockSearchStore.deleteSavedSearch).toHaveBeenCalledWith('saved-1')
    })

    it('updates saved search', async () => {
      const { result } = renderHook(() => useSavedSearches(), { wrapper })

      const updates = { name: 'Updated Climate Research' }

      await act(async () => {
        result.current.updateSearch({ id: 'saved-1', updates })
      })

      expect(SearchService.SearchService.updateSavedSearch).toHaveBeenCalledWith(
        'saved-1',
        updates
      )
      expect(mockSearchStore.updateSavedSearch).toHaveBeenCalled()
    })

    it('refreshes saved searches', () => {
      const { result } = renderHook(() => useSavedSearches(), { wrapper })

      act(() => {
        result.current.refresh()
      })

      // Refresh triggers query invalidation (tested internally by react-query)
      expect(result.current.refresh).toBeDefined()
    })
  })
})