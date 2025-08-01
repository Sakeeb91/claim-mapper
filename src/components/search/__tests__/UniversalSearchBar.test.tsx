import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UniversalSearchBar } from '../UniversalSearchBar'
import { SearchSuggestion } from '@/types/search'
import * as searchStore from '@/store/searchStore'

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock Zustand store
const mockUseSearchStore = {
  semanticEnabled: false,
  toggleSemanticSearch: jest.fn(),
  query: {
    filters: {
      nodeTypes: ['claim', 'evidence'],
      linkTypes: ['supports'],
      confidenceRange: [0, 1],
    },
  },
}

jest.mock('@/store/searchStore', () => ({
  useSearchStore: () => mockUseSearchStore,
}))

// Mock hooks
jest.mock('@/hooks/useSearch', () => ({
  useSearch: () => ({
    search: jest.fn(),
    results: [],
    loading: false,
    error: null,
  }),
  useSearchHistory: () => ({
    history: ['climate change', 'global warming', 'evidence'],
    addToHistory: jest.fn(),
    clearHistory: jest.fn(),
  }),
}))

describe('UniversalSearchBar', () => {
  const mockSuggestions: SearchSuggestion[] = [
    {
      id: 'suggestion-1',
      type: 'autocomplete',
      text: 'climate change impacts',
      displayText: 'climate change impacts',
      relevance: 0.9,
      metadata: { category: 'Claims', count: 42 },
    },
    {
      id: 'suggestion-2',
      type: 'entity',
      text: 'renewable energy',
      displayText: 'renewable energy',
      relevance: 0.8,
      metadata: { category: 'Evidence', count: 23 },
    },
    {
      id: 'suggestion-3',
      type: 'popular',
      text: 'carbon emissions',
      displayText: 'carbon emissions',
      relevance: 0.7,
    },
  ]

  const defaultProps = {
    query: '',
    onQueryChange: jest.fn(),
    onSearch: jest.fn(),
    suggestions: mockSuggestions,
    loading: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset store state
    mockUseSearchStore.semanticEnabled = false
  })

  describe('Basic Rendering', () => {
    it('renders with default props', () => {
      render(<UniversalSearchBar {...defaultProps} />)
      
      expect(screen.getByRole('textbox')).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/search claims, evidence/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
    })

    it('renders with custom placeholder', () => {
      render(
        <UniversalSearchBar 
          {...defaultProps} 
          placeholder="Custom search placeholder" 
        />
      )
      
      expect(screen.getByPlaceholderText('Custom search placeholder')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(
        <UniversalSearchBar {...defaultProps} className="custom-search" />
      )
      
      expect(container.firstChild).toHaveClass('custom-search')
    })

    it('shows loading state', () => {
      render(<UniversalSearchBar {...defaultProps} loading={true} />)
      
      const searchIcon = screen.getByRole('textbox').parentElement?.querySelector('svg')
      expect(searchIcon).toHaveClass('animate-pulse')
    })
  })

  describe('Input Interaction', () => {
    it('handles input changes', async () => {
      const user = userEvent.setup()
      const onQueryChange = jest.fn()
      
      render(<UniversalSearchBar {...defaultProps} onQueryChange={onQueryChange} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'climate')
      
      expect(onQueryChange).toHaveBeenLastCalledWith('climate')
    })

    it('expands when focused', async () => {
      const user = userEvent.setup()
      
      render(<UniversalSearchBar {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.click(input)
      
      // Should show additional controls when expanded
      expect(screen.getByRole('button', { name: /semantic search/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /advanced search/i })).toBeInTheDocument()
    })

    it('shows clear button when query exists', async () => {
      const user = userEvent.setup()
      
      render(<UniversalSearchBar {...defaultProps} query="test query" />)
      
      const input = screen.getByRole('textbox')
      await user.click(input)
      
      expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument()
    })

    it('clears query when clear button is clicked', async () => {
      const user = userEvent.setup()
      const onQueryChange = jest.fn()
      
      render(
        <UniversalSearchBar 
          {...defaultProps} 
          query="test query" 
          onQueryChange={onQueryChange} 
        />
      )
      
      const input = screen.getByRole('textbox')
      await user.click(input)
      
      const clearButton = screen.getByRole('button', { name: /clear search/i })
      await user.click(clearButton)
      
      expect(onQueryChange).toHaveBeenCalledWith('')
    })
  })

  describe('Search Functionality', () => {
    it('calls onSearch when Enter is pressed', async () => {
      const user = userEvent.setup()
      const onSearch = jest.fn()
      
      render(
        <UniversalSearchBar 
          {...defaultProps} 
          query="climate change" 
          onSearch={onSearch} 
        />
      )
      
      const input = screen.getByRole('textbox')
      await user.type(input, '{enter}')
      
      expect(onSearch).toHaveBeenCalledWith({
        text: 'climate change',
        filters: mockUseSearchStore.query.filters,
        sortBy: 'relevance',
        sortOrder: 'desc',
        page: 1,
        limit: 20,
      })
    })

    it('calls onSearch when search button is clicked', async () => {
      const user = userEvent.setup()
      const onSearch = jest.fn()
      
      render(
        <UniversalSearchBar 
          {...defaultProps} 
          query="climate change" 
          onSearch={onSearch} 
        />
      )
      
      const input = screen.getByRole('textbox')
      await user.click(input)
      
      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)
      
      expect(onSearch).toHaveBeenCalled()
    })

    it('disables search button when query is empty', async () => {
      const user = userEvent.setup()
      
      render(<UniversalSearchBar {...defaultProps} query="" />)
      
      const input = screen.getByRole('textbox')
      await user.click(input)
      
      const searchButton = screen.getByRole('button', { name: /search/i })
      expect(searchButton).toBeDisabled()
    })

    it('does not search with empty query', async () => {
      const user = userEvent.setup()
      const onSearch = jest.fn()
      
      render(<UniversalSearchBar {...defaultProps} query="" onSearch={onSearch} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, '{enter}')
      
      expect(onSearch).not.toHaveBeenCalled()
    })
  })

  describe('Suggestions', () => {
    it('shows suggestions when input is focused and has value', async () => {
      const user = userEvent.setup()
      
      render(<UniversalSearchBar {...defaultProps} query="climate" />)
      
      const input = screen.getByRole('textbox')
      await user.click(input)
      
      await waitFor(() => {
        expect(screen.getByText('Suggestions')).toBeInTheDocument()
        expect(screen.getByText('climate change impacts')).toBeInTheDocument()
        expect(screen.getByText('renewable energy')).toBeInTheDocument()
      })
    })

    it('shows recent searches', async () => {
      const user = userEvent.setup()
      
      render(<UniversalSearchBar {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.click(input)
      
      await waitFor(() => {
        expect(screen.getByText('Recent')).toBeInTheDocument()
        expect(screen.getByText('climate change')).toBeInTheDocument()
        expect(screen.getByText('global warming')).toBeInTheDocument()
      })
    })

    it('handles suggestion click', async () => {
      const user = userEvent.setup()
      const onQueryChange = jest.fn()
      const onSearch = jest.fn()
      
      render(
        <UniversalSearchBar 
          {...defaultProps} 
          query="climate"
          onQueryChange={onQueryChange}
          onSearch={onSearch}
        />
      )
      
      const input = screen.getByRole('textbox')
      await user.click(input)
      
      await waitFor(() => {
        expect(screen.getByText('climate change impacts')).toBeInTheDocument()
      })
      
      await user.click(screen.getByText('climate change impacts'))
      
      expect(onQueryChange).toHaveBeenCalledWith('climate change impacts')
      expect(onSearch).toHaveBeenCalled()
    })

    it('navigates suggestions with arrow keys', async () => {
      const user = userEvent.setup()
      
      render(<UniversalSearchBar {...defaultProps} query="climate" />)
      
      const input = screen.getByRole('textbox')
      await user.click(input)
      
      await waitFor(() => {
        expect(screen.getByText('climate change impacts')).toBeInTheDocument()
      })
      
      await user.keyboard('{ArrowDown}')
      // First suggestion should be highlighted
      
      await user.keyboard('{ArrowDown}')
      // Second suggestion should be highlighted
      
      await user.keyboard('{ArrowUp}')
      // Back to first suggestion
    })

    it('selects suggestion with Enter key', async () => {
      const user = userEvent.setup()
      const onSearch = jest.fn()
      
      render(
        <UniversalSearchBar 
          {...defaultProps} 
          query="climate"
          onSearch={onSearch}
        />
      )
      
      const input = screen.getByRole('textbox')
      await user.click(input)
      
      await waitFor(() => {
        expect(screen.getByText('climate change impacts')).toBeInTheDocument()
      })
      
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{Enter}')
      
      expect(onSearch).toHaveBeenCalled()
    })
  })

  describe('Semantic Search', () => {
    it('toggles semantic search', async () => {
      const user = userEvent.setup()
      
      render(<UniversalSearchBar {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.click(input)
      
      const semanticButton = screen.getByRole('button', { name: /semantic search/i })
      await user.click(semanticButton)
      
      expect(mockUseSearchStore.toggleSemanticSearch).toHaveBeenCalled()
    })

    it('shows semantic search state', async () => {
      const user = userEvent.setup()
      mockUseSearchStore.semanticEnabled = true
      
      render(<UniversalSearchBar {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.click(input)
      
      const semanticButton = screen.getByRole('button', { name: /semantic search enabled/i })
      expect(semanticButton).toHaveClass('bg-primary')
    })

    it('hides semantic toggle when showSemanticToggle is false', async () => {
      const user = userEvent.setup()
      
      render(<UniversalSearchBar {...defaultProps} showSemanticToggle={false} />)
      
      const input = screen.getByRole('textbox')
      await user.click(input)
      
      expect(screen.queryByRole('button', { name: /semantic search/i })).not.toBeInTheDocument()
    })
  })

  describe('Advanced Search', () => {
    it('toggles advanced search panel', async () => {
      const user = userEvent.setup()
      
      render(<UniversalSearchBar {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.click(input)
      
      const advancedButton = screen.getByRole('button', { name: /advanced search/i })
      await user.click(advancedButton)
      
      expect(screen.getByText('Advanced Search Options')).toBeInTheDocument()
    })

    it('hides advanced search when showFilters is false', async () => {
      const user = userEvent.setup()
      
      render(<UniversalSearchBar {...defaultProps} showFilters={false} />)
      
      const input = screen.getByRole('textbox')
      await user.click(input)
      
      expect(screen.queryByRole('button', { name: /advanced search/i })).not.toBeInTheDocument()
    })

    it('toggles advanced search with Shift+Tab', async () => {
      const user = userEvent.setup()
      
      render(<UniversalSearchBar {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.click(input)
      
      await user.keyboard('{Shift>}{Tab}{/Shift}')
      
      expect(screen.getByText('Advanced Search Options')).toBeInTheDocument()
    })
  })

  describe('Keyboard Navigation', () => {
    it('closes suggestions with Escape key', async () => {
      const user = userEvent.setup()
      
      render(<UniversalSearchBar {...defaultProps} query="climate" />)
      
      const input = screen.getByRole('textbox')
      await user.click(input)
      
      await waitFor(() => {
        expect(screen.getByText('Suggestions')).toBeInTheDocument()
      })
      
      await user.keyboard('{Escape}')
      
      expect(screen.queryByText('Suggestions')).not.toBeInTheDocument()
    })

    it('shows keyboard shortcuts hint when expanded', async () => {
      const user = userEvent.setup()
      
      render(<UniversalSearchBar {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.click(input)
      
      expect(screen.getByText('↑↓ navigate')).toBeInTheDocument()
      expect(screen.getByText('↵ search')).toBeInTheDocument()
      expect(screen.getByText('⇧⇥ filters')).toBeInTheDocument()
    })
  })

  describe('Click Outside', () => {
    it('closes suggestions when clicking outside', async () => {
      const user = userEvent.setup()
      
      render(
        <div>
          <UniversalSearchBar {...defaultProps} query="climate" />
          <div data-testid="outside">Outside element</div>
        </div>
      )
      
      const input = screen.getByRole('textbox')
      await user.click(input)
      
      await waitFor(() => {
        expect(screen.getByText('Suggestions')).toBeInTheDocument()
      })
      
      await user.click(screen.getByTestId('outside'))
      
      await waitFor(() => {
        expect(screen.queryByText('Suggestions')).not.toBeInTheDocument()
      })
    })
  })

  describe('Quick Actions', () => {
    it('shows quick actions when query exists', async () => {
      const user = userEvent.setup()
      
      render(<UniversalSearchBar {...defaultProps} query="climate change" />)
      
      const input = screen.getByRole('textbox')
      await user.click(input)
      
      await waitFor(() => {
        expect(screen.getByText('Quick Actions')).toBeInTheDocument()
        expect(screen.getByText('Search for "climate change"')).toBeInTheDocument()
      })
    })

    it('shows semantic search quick action when enabled', async () => {
      const user = userEvent.setup()
      mockUseSearchStore.semanticEnabled = true
      
      render(<UniversalSearchBar {...defaultProps} query="climate change" />)
      
      const input = screen.getByRole('textbox')
      await user.click(input)
      
      await waitFor(() => {
        expect(screen.getByText('Semantic search for "climate change"')).toBeInTheDocument()
      })
    })
  })

  describe('Empty States', () => {
    it('shows empty state when no suggestions and query exists', async () => {
      const user = userEvent.setup()
      
      render(<UniversalSearchBar {...defaultProps} suggestions={[]} query="xyz" />)
      
      const input = screen.getByRole('textbox')
      await user.click(input)
      
      await waitFor(() => {
        expect(screen.getByText('No suggestions found. Press Enter to search.')).toBeInTheDocument()
      })
    })
  })
})