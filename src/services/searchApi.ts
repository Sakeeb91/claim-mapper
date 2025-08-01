import axios from 'axios';
import {
  SearchQuery,
  SearchResponse,
  SearchResult,
  SearchSuggestion,
  SearchFacets,
  SemanticSearchRequest,
  SavedSearch,
  SearchAnalytics,
  SearchPreferences
} from '@/types/search';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Create axios instance with interceptors
const searchApi = axios.create({
  baseURL: `${API_BASE}/api/search`,
  timeout: 30000,
});

// Request interceptor to add auth token
searchApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
searchApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Search API Error:', error);
    throw error;
  }
);

export class SearchService {
  /**
   * Universal search across all content types
   */
  static async search(query: SearchQuery): Promise<SearchResponse> {
    const params = new URLSearchParams();
    
    // Basic query parameters
    params.append('q', query.text);
    params.append('page', query.page.toString());
    params.append('limit', query.limit.toString());
    params.append('sort', query.sortBy);
    
    // Content type filters
    if (query.filters.types.length > 0) {
      query.filters.types.forEach(type => params.append('type', type));
    }
    
    // Date range
    if (query.filters.dateRange?.start) {
      params.append('dateFrom', query.filters.dateRange.start.toISOString());
    }
    if (query.filters.dateRange?.end) {
      params.append('dateTo', query.filters.dateRange.end.toISOString());
    }
    
    // Confidence range
    if (query.filters.confidenceRange[0] > 0) {
      params.append('minConfidence', query.filters.confidenceRange[0].toString());
    }
    if (query.filters.confidenceRange[1] < 100) {
      params.append('maxConfidence', query.filters.confidenceRange[1].toString());
    }
    
    // Tags
    query.filters.tags.forEach(tag => params.append('tags', tag));
    
    // Authors
    query.filters.authors.forEach(author => params.append('authors', author));
    
    // Sources
    query.filters.sources.forEach(source => params.append('sources', source));
    
    // Status
    query.filters.status.forEach(status => params.append('status', status));
    
    // Boolean filters
    if (query.filters.hasEvidence !== null) {
      params.append('hasEvidence', query.filters.hasEvidence.toString());
    }
    if (query.filters.hasReasoning !== null) {
      params.append('hasReasoning', query.filters.hasReasoning.toString());
    }
    
    // Geospatial filter
    if (query.filters.location) {
      params.append('lat', query.filters.location.center[0].toString());
      params.append('lng', query.filters.location.center[1].toString());
      params.append('radius', query.filters.location.radius.toString());
    }
    
    const response = await searchApi.get(`/?${params.toString()}`);
    return response.data;
  }

  /**
   * Get search suggestions and autocomplete
   */
  static async getSuggestions(query: string, limit = 10): Promise<{ suggestions: SearchSuggestion[]; recent: string[] }> {
    const response = await searchApi.get('/suggestions', {
      params: { q: query, limit }
    });
    return response.data.data;
  }

  /**
   * Semantic similarity search using ML embeddings
   */
  static async semanticSearch(request: SemanticSearchRequest): Promise<SearchResult[]> {
    const response = await searchApi.post('/semantic', request);
    return response.data.data;
  }

  /**
   * Get similar content based on existing content
   */
  static async getSimilarContent(
    contentId: string, 
    contentType: string, 
    limit = 10
  ): Promise<SearchResult[]> {
    const response = await searchApi.get(`/similar/${contentType}/${contentId}`, {
      params: { limit }
    });
    return response.data.data;
  }

  /**
   * Advanced faceted search with aggregations
   */
  static async facetedSearch(
    query: string, 
    facetFields: string[],
    filters?: Record<string, any>
  ): Promise<{ results: SearchResult[]; facets: SearchFacets }> {
    const response = await searchApi.post('/faceted', {
      query,
      facetFields,
      filters
    });
    return response.data.data;
  }

  /**
   * Get search analytics and insights
   */
  static async getSearchAnalytics(days = 7): Promise<any> {
    const response = await searchApi.get('/analytics', {
      params: { days }
    });
    return response.data.data;
  }

  /**
   * Track search event for analytics
   */
  static async trackSearch(analytics: Partial<SearchAnalytics>): Promise<void> {
    await searchApi.post('/track', analytics);
  }

  /**
   * Save a search query
   */
  static async saveSearch(search: Omit<SavedSearch, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedSearch> {
    const response = await searchApi.post('/saved', search);
    return response.data.data;
  }

  /**
   * Get user's saved searches
   */
  static async getSavedSearches(): Promise<SavedSearch[]> {
    const response = await searchApi.get('/saved');
    return response.data.data;
  }

  /**
   * Update a saved search
   */
  static async updateSavedSearch(id: string, updates: Partial<SavedSearch>): Promise<SavedSearch> {
    const response = await searchApi.patch(`/saved/${id}`, updates);
    return response.data.data;
  }

  /**
   * Delete a saved search
   */
  static async deleteSavedSearch(id: string): Promise<void> {
    await searchApi.delete(`/saved/${id}`);
  }

  /**
   * Get user search preferences
   */
  static async getSearchPreferences(): Promise<SearchPreferences> {
    const response = await searchApi.get('/preferences');
    return response.data.data;
  }

  /**
   * Update user search preferences
   */
  static async updateSearchPreferences(preferences: Partial<SearchPreferences>): Promise<SearchPreferences> {
    const response = await searchApi.patch('/preferences', preferences);
    return response.data.data;
  }

  /**
   * Export search results in various formats
   */
  static async exportResults(
    query: SearchQuery, 
    format: 'json' | 'csv' | 'xlsx' = 'json'
  ): Promise<Blob> {
    const response = await searchApi.post('/export', 
      { query, format },
      { responseType: 'blob' }
    );
    return response.data;
  }

  /**
   * Get popular searches and trending topics
   */
  static async getTrendingSearches(limit = 10): Promise<{
    popular: { query: string; count: number }[];
    trending: { query: string; growth: number }[];
  }> {
    const response = await searchApi.get('/trending', {
      params: { limit }
    });
    return response.data.data;
  }

  /**
   * Batch search for multiple queries
   */
  static async batchSearch(queries: string[]): Promise<Record<string, SearchResult[]>> {
    const response = await searchApi.post('/batch', { queries });
    return response.data.data;
  }

  /**
   * Search within specific project
   */
  static async searchInProject(projectId: string, query: SearchQuery): Promise<SearchResponse> {
    const params = new URLSearchParams();
    params.append('projectId', projectId);
    params.append('q', query.text);
    params.append('page', query.page.toString());
    params.append('limit', query.limit.toString());
    
    const response = await searchApi.get(`/project/${projectId}?${params.toString()}`);
    return response.data;
  }

  /**
   * Real-time search with streaming results
   */
  static async streamSearch(query: SearchQuery, onResult: (result: SearchResult) => void): Promise<void> {
    const response = await fetch(`${API_BASE}/api/search/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
      body: JSON.stringify(query),
    });

    if (!response.body) {
      throw new Error('Stream not supported');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.trim() && line.startsWith('data: ')) {
            try {
              const result = JSON.parse(line.slice(6));
              onResult(result);
            } catch (e) {
              console.warn('Failed to parse streaming result:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

// Utility functions for search
export const SearchUtils = {
  /**
   * Highlight search terms in text
   */
  highlightText(text: string, query: string): string {
    if (!query.trim()) return text;
    
    const terms = query.toLowerCase().split(/\s+/);
    let highlightedText = text;
    
    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
    });
    
    return highlightedText;
  },

  /**
   * Generate search snippet from full text
   */
  generateSnippet(text: string, query: string, maxLength = 200): string {
    const terms = query.toLowerCase().split(/\s+/);
    const lowerText = text.toLowerCase();
    
    // Find the first occurrence of any search term
    let earliestIndex = text.length;
    terms.forEach(term => {
      const index = lowerText.indexOf(term);
      if (index !== -1 && index < earliestIndex) {
        earliestIndex = index;
      }
    });
    
    // Extract snippet around the found term
    const start = Math.max(0, earliestIndex - maxLength / 2);
    const end = Math.min(text.length, start + maxLength);
    
    let snippet = text.slice(start, end);
    
    // Add ellipsis if truncated
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';
    
    return snippet;
  },

  /**
   * Parse search query for advanced syntax
   */
  parseAdvancedQuery(query: string): {
    terms: string[];
    phrases: string[];
    excluded: string[];
    fieldQueries: Record<string, string>;
  } {
    const terms: string[] = [];
    const phrases: string[] = [];
    const excluded: string[] = [];
    const fieldQueries: Record<string, string> = {};
    
    // Match quoted phrases
    const phraseMatches = query.match(/"([^"]+)"/g);
    if (phraseMatches) {
      phrases.push(...phraseMatches.map(p => p.slice(1, -1)));
      query = query.replace(/"[^"]+"/g, '');
    }
    
    // Match excluded terms (-term)
    const excludeMatches = query.match(/-\\w+/g);
    if (excludeMatches) {
      excluded.push(...excludeMatches.map(e => e.slice(1)));
      query = query.replace(/-\\w+/g, '');
    }
    
    // Match field queries (field:value)
    const fieldMatches = query.match(/\\w+:[^\\s]+/g);
    if (fieldMatches) {
      fieldMatches.forEach(match => {
        const [field, value] = match.split(':', 2);
        fieldQueries[field] = value;
      });
      query = query.replace(/\\w+:[^\\s]+/g, '');
    }
    
    // Remaining terms
    terms.push(...query.split(/\\s+/).filter(t => t.trim()));
    
    return { terms, phrases, excluded, fieldQueries };
  },

  /**
   * Calculate search relevance score
   */
  calculateRelevance(result: SearchResult, query: string): number {
    const terms = query.toLowerCase().split(/\\s+/);
    let score = 0;
    
    const titleWeight = 3;
    const contentWeight = 1;
    const tagWeight = 2;
    
    terms.forEach(term => {
      // Title matches
      if (result.title.toLowerCase().includes(term)) {
        score += titleWeight;
      }
      
      // Content matches
      const contentMatches = (result.fullContent.toLowerCase().match(new RegExp(term, 'g')) || []).length;
      score += contentMatches * contentWeight;
      
      // Tag matches
      if (result.metadata.tags.some(tag => tag.toLowerCase().includes(term))) {
        score += tagWeight;
      }
    });
    
    return score;
  },

  /**
   * Filter results by confidence threshold
   */
  filterByConfidence(results: SearchResult[], minConfidence: number): SearchResult[] {
    return results.filter(result => (result.metadata.confidence || 0) >= minConfidence);
  },

  /**
   * Sort results by multiple criteria
   */
  sortResults(
    results: SearchResult[], 
    sortBy: 'relevance' | 'date' | 'confidence' | 'popularity',
    order: 'asc' | 'desc' = 'desc'
  ): SearchResult[] {
    const sorted = [...results].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'relevance':
          comparison = b.relevanceScore - a.relevanceScore;
          break;
        case 'date':
          comparison = new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime();
          break;
        case 'confidence':
          comparison = (b.metadata.confidence || 0) - (a.metadata.confidence || 0);
          break;
        case 'popularity':
          // Implement popularity scoring based on views, likes, etc.
          comparison = 0; // Placeholder
          break;
      }
      
      return order === 'asc' ? -comparison : comparison;
    });
    
    return sorted;
  }
};