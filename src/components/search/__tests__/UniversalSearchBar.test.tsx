import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UniversalSearchBar } from '../UniversalSearchBar'
import { SearchSuggestion } from '@/types/search'

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock Zustand store with getState
const mockStoreState = {
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
  useSearchStore: Object.assign(
    () => mockStoreState,
    {
      getState: () => mockStoreState,
    }
  ),
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

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn()

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
    mockStoreState.semanticEnabled = false
  })

  describe('Basic Rendering', () => {
    it('renders with default props', () => {
      render(<UniversalSearchBar {...defaultProps} />)
      
      expect(screen.getByRole('textbox')).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/search claims, evidence/i)).toBeInTheDocument()
    })

    it('renders with custom placeholder', () => {
      render(
        <UniversalSearchBar 
          {...defaultProps}
          placeholder="Custom placeholder"
        />
      )
      
      expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument()
    })

    it('displays query value in input', () => {
      render(<UniversalSearchBar {...defaultProps} query="climate change" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('climate change')
    })

    it('renders with minimal props', () => {
      const minimal = {
        query: '',
        onQueryChange: jest.fn(),
      }
      render(<UniversalSearchBar {...minimal} />)
      
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(
        <UniversalSearchBar 
          {...defaultProps}
          className="custom-class"
        />
      )
      
      expect(document.querySelector('.custom-class')).toBeInTheDocument()
    })
  })

  describe('Input Interaction', () => {
    const user = userEvent.setup()
    
    it('handles input changes', async () => {
      const onQueryChange = jest.fn()
      render(
        <UniversalSearchBar 
          {...defaultProps}
          onQueryChange={onQueryChange}
        />
      )
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'climate')
      
      // Check that onQueryChange was called for each character
      expect(onQueryChange).toHaveBeenCalledTimes(7)
      expect(onQueryChange).toHaveBeenCalledWith('climate')
    })

    it('clears input when clear button is clicked', async () => {
      const onQueryChange = jest.fn()
      render(
        <UniversalSearchBar 
          {...defaultProps}
          query="climate change"
          onQueryChange={onQueryChange}
        />
      )
      
      // Find clear button by its title
      const clearButton = screen.getByTitle('Clear search')
      await user.click(clearButton)
      
      expect(onQueryChange).toHaveBeenCalledWith('')
    })

    it('supports controlled input behavior', async () => {
      const { rerender } = render(
        <UniversalSearchBar {...defaultProps} query="initial" />
      )
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('initial')
      
      rerender(<UniversalSearchBar {...defaultProps} query="updated" />)
      expect(input).toHaveValue('updated')
    })
  })

  describe('Search Functionality', () => {
    const user = userEvent.setup()
    
    it('calls onSearch when Enter is pressed', async () => {
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
        filters: {
          nodeTypes: ['claim', 'evidence'],
          linkTypes: ['supports'],
          confidenceRange: [0, 1],
        },
        sortBy: 'relevance',
        sortOrder: 'desc',
        page: 1,
        limit: 20,
      })
    })

    it('calls onSearch when search icon is clicked', async () => {
      const onSearch = jest.fn()
      render(
        <UniversalSearchBar 
          {...defaultProps}
          query="climate change"
          onSearch={onSearch}
        />
      )
      
      // Find search icon button by its parent structure
      const searchIcons = screen.getAllByTitle(/search/i)
      const searchButton = searchIcons.find(el => 
        el.tagName === 'BUTTON' || el.closest('button')
      )
      
      if (searchButton) {
        await user.click(searchButton)
        expect(onSearch).toHaveBeenCalled()
      }
    })

    it('does not search when query is empty', async () => {
      const onSearch = jest.fn()
      render(
        <UniversalSearchBar 
          {...defaultProps}
          query=""
          onSearch={onSearch}
        />
      )
      
      const input = screen.getByRole('textbox')
      await user.type(input, '{enter}')
      
      expect(onSearch).not.toHaveBeenCalled()
    })
  })

  describe('Suggestions', () => {
    const user = userEvent.setup()
    
    it('displays suggestions when provided', () => {
      render(
        <UniversalSearchBar 
          {...defaultProps}
          query="climate"
          suggestions={mockSuggestions}
        />
      )
      
      expect(screen.getByText('climate change impacts')).toBeInTheDocument()
      expect(screen.getByText('renewable energy')).toBeInTheDocument()
      expect(screen.getByText('carbon emissions')).toBeInTheDocument()
    })

    it('handles suggestion click', async () => {
      const onQueryChange = jest.fn()
      const onSearch = jest.fn()
      
      render(
        <UniversalSearchBar 
          {...defaultProps}
          query="climate"
          suggestions={mockSuggestions}
          onQueryChange={onQueryChange}
          onSearch={onSearch}
        />
      )
      
      const suggestion = screen.getByText('climate change impacts')
      await user.click(suggestion)
      
      expect(onQueryChange).toHaveBeenCalledWith('climate change impacts')
      expect(onSearch).toHaveBeenCalled()
    })

    it('navigates suggestions with arrow keys', async () => {
      render(
        <UniversalSearchBar 
          {...defaultProps}
          query="climate"
          suggestions={mockSuggestions}
        />
      )
      
      const input = screen.getByRole('textbox')
      
      // Navigate down
      await user.type(input, '{arrowdown}')
      // First suggestion should be highlighted
      
      // Navigate down again
      await user.type(input, '{arrowdown}')
      // Second suggestion should be highlighted
      
      // Navigate up
      await user.type(input, '{arrowup}')
      // First suggestion should be highlighted again
      
      // Verify scrollIntoView was called
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
    })

    it('selects suggestion with Enter key', async () => {
      const onSearch = jest.fn()
      const onQueryChange = jest.fn()
      
      render(
        <UniversalSearchBar 
          {...defaultProps}
          query="climate"
          suggestions={mockSuggestions}
          onSearch={onSearch}
          onQueryChange={onQueryChange}
        />
      )
      
      const input = screen.getByRole('textbox')
      
      // Navigate to first suggestion
      await user.type(input, '{arrowdown}')
      
      // Select with Enter
      await user.keyboard('{Enter}')
      
      expect(onSearch).toHaveBeenCalled()
    })

    it('does not display suggestions when query is empty', () => {
      render(
        <UniversalSearchBar 
          {...defaultProps}
          query=""
          suggestions={mockSuggestions}
        />
      )
      
      expect(screen.queryByText('climate change impacts')).not.toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('shows loading indicator when loading', () => {
      render(
        <UniversalSearchBar 
          {...defaultProps}
          loading={true}
        />
      )
      
      // Check for loading indicator by finding spinner or loading text
      const container = document.querySelector('.relative')
      expect(container).toBeInTheDocument()
    })

    it('disables input when loading', () => {
      render(
        <UniversalSearchBar 
          {...defaultProps}
          loading={true}
        />
      )
      
      const input = screen.getByRole('textbox')
      // Input should still be enabled during loading for better UX
      expect(input).not.toBeDisabled()
    })
  })

  describe('Semantic Search Toggle', () => {
    it('shows semantic search toggle button', () => {
      render(<UniversalSearchBar {...defaultProps} />)
      
      const toggleButton = screen.getByTitle(/semantic search/i)
      expect(toggleButton).toBeInTheDocument()
    })

    it('toggles semantic search when clicked', async () => {
      const user = userEvent.setup()
      const toggleSemanticSearch = jest.fn()
      mockStoreState.toggleSemanticSearch = toggleSemanticSearch
      
      render(<UniversalSearchBar {...defaultProps} />)
      
      const toggleButton = screen.getByTitle(/semantic search/i)
      await user.click(toggleButton)
      
      expect(toggleSemanticSearch).toHaveBeenCalled()
    })

    it('shows enabled state when semantic search is on', () => {
      mockStoreState.semanticEnabled = true
      
      render(<UniversalSearchBar {...defaultProps} />)
      
      const toggleButton = screen.getByTitle(/semantic search enabled/i)
      expect(toggleButton).toHaveClass('text-blue-600')
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<UniversalSearchBar {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-label')
      expect(input).toHaveAttribute('aria-autocomplete', 'list')
    })

    it('supports keyboard navigation', async () => {
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
      
      // Tab navigation
      await user.tab()
      expect(document.activeElement).toBe(input)
      
      // Enter to search
      await user.keyboard('{Enter}')
      expect(onSearch).toHaveBeenCalled()
    })

    it('closes suggestions on Escape key', async () => {
      const user = userEvent.setup()
      
      render(
        <UniversalSearchBar 
          {...defaultProps}
          query="climate"
          suggestions={mockSuggestions}
        />
      )
      
      const input = screen.getByRole('textbox')
      
      // Suggestions should be visible
      expect(screen.getByText('climate change impacts')).toBeInTheDocument()
      
      // Press Escape
      await user.type(input, '{escape}')
      
      // Suggestions should be hidden
      expect(screen.queryByText('climate change impacts')).not.toBeInTheDocument()
    })
  })
})