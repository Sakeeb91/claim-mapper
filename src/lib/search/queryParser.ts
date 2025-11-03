/**
 * Search Query Parser
 * Business logic for parsing and normalizing search queries
 */

export interface ParsedQuery {
  terms: string[];
  filters: Record<string, string[]>;
  operators: string[];
  originalQuery: string;
}

export class QueryParser {
  /**
   * Parse search query into structured format
   */
  parse(query: string): ParsedQuery {
    const normalized = query.trim().toLowerCase();

    // Extract filters (e.g., "tag:science type:claim")
    const filterRegex = /(\w+):(\S+)/g;
    const filters: Record<string, string[]> = {};
    let queryWithoutFilters = normalized;

    let match;
    while ((match = filterRegex.exec(normalized)) !== null) {
      const [fullMatch, key, value] = match;
      if (!filters[key]) {
        filters[key] = [];
      }
      filters[key].push(value);
      queryWithoutFilters = queryWithoutFilters.replace(fullMatch, '');
    }

    // Extract search terms
    const terms = queryWithoutFilters
      .split(/\s+/)
      .filter(term => term.length > 0);

    return {
      terms,
      filters,
      operators: [],
      originalQuery: query,
    };
  }

  /**
   * Validate search query
   */
  validate(query: string): { valid: boolean; error?: string } {
    if (!query || query.trim().length < 2) {
      return {
        valid: false,
        error: 'Query must be at least 2 characters long',
      };
    }

    if (query.length > 200) {
      return {
        valid: false,
        error: 'Query must be less than 200 characters',
      };
    }

    return { valid: true };
  }
}
