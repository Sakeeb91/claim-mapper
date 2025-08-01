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

  describe('basic functionality', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useSearch(), { wrapper })

      expect(result.current.query).toEqual(mockSearchStore.query)
      expect(result.current.results).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe(null)
      expect(result.current.totalCount).toBe(0)
      expect(result.current.hasMore).toBe(false)
    })

    it('should have required functions', () => {
      const { result } = renderHook(() => useSearch(), { wrapper })

      expect(typeof result.current.search).toBe('function')
      expect(typeof result.current.refineSearch).toBe('function')
      expect(typeof result.current.loadMore).toBe('function')
      expect(typeof result.current.reset).toBe('function')
    })
  })
})