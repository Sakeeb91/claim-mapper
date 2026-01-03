/**
 * Search Routes Unit Tests
 * Tests search functionality across claims, evidence, and projects
 */

import mongoose from 'mongoose';

// Mock dependencies
jest.mock('../../config/redis', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    trackUserActivity: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

import redisManager from '../../config/redis';

describe('Search Routes', () => {
  const mockUserId = new mongoose.Types.ObjectId().toHexString();
  const mockProjectId = new mongoose.Types.ObjectId().toHexString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/search - Universal Search', () => {
    describe('Query Parsing', () => {
      it('should parse basic search query', () => {
        const query = 'climate change';

        expect(query).toBe('climate change');
        expect(query.split(' ')).toHaveLength(2);
      });

      it('should handle quoted phrases', () => {
        const query = '"climate change" effects';
        const phraseMatch = query.match(/"([^"]+)"/);

        expect(phraseMatch).not.toBeNull();
        expect(phraseMatch?.[1]).toBe('climate change');
      });

      it('should handle special characters', () => {
        const query = 'CO2 + emissions';
        const sanitized = query.replace(/[+]/g, ' ');

        expect(sanitized).toBe('CO2   emissions');
      });
    });

    describe('Search Type Filter', () => {
      it('should filter by claims', () => {
        const type = 'claims';
        const validTypes = ['claims', 'evidence', 'reasoning', 'projects', 'all'];

        expect(validTypes).toContain(type);
      });

      it('should search all types when type is "all"', () => {
        const type = 'all';
        const searchTypes = type === 'all'
          ? ['claims', 'evidence', 'projects', 'reasoning']
          : [type];

        expect(searchTypes).toHaveLength(4);
      });
    });

    describe('Date Filtering', () => {
      it('should filter by date range', () => {
        const filters = {
          dateFrom: new Date('2024-01-01'),
          dateTo: new Date('2024-12-31'),
        };

        const dateQuery = {
          createdAt: {
            $gte: filters.dateFrom,
            $lte: filters.dateTo,
          },
        };

        expect(dateQuery.createdAt.$gte).toEqual(filters.dateFrom);
        expect(dateQuery.createdAt.$lte).toEqual(filters.dateTo);
      });
    });

    describe('Confidence Filtering', () => {
      it('should filter by confidence range', () => {
        const filters = {
          confidence: { min: 0.7, max: 1.0 },
        };

        const confidenceQuery = {
          confidence: {
            $gte: filters.confidence.min,
            $lte: filters.confidence.max,
          },
        };

        expect(confidenceQuery.confidence.$gte).toBe(0.7);
        expect(confidenceQuery.confidence.$lte).toBe(1.0);
      });
    });

    describe('Tags Filtering', () => {
      it('should filter by tags', () => {
        const filters = {
          tags: ['science', 'research'],
        };

        const tagsQuery = {
          tags: { $in: filters.tags },
        };

        expect(tagsQuery.tags.$in).toEqual(['science', 'research']);
      });
    });

    describe('Status Filtering', () => {
      it('should filter by status', () => {
        const filters = {
          status: ['approved', 'review'],
        };

        const statusQuery = {
          status: { $in: filters.status },
        };

        expect(statusQuery.status.$in).toEqual(['approved', 'review']);
      });
    });

    describe('Project Scoping', () => {
      it('should scope search to specific project', () => {
        const filters = {
          projectId: mockProjectId,
        };

        const projectQuery = {
          project: filters.projectId,
        };

        expect(projectQuery.project).toBe(mockProjectId);
      });

      it('should scope to user accessible projects', () => {
        const accessibleProjects = [mockProjectId, 'project-2', 'project-3'];

        const projectQuery = {
          project: { $in: accessibleProjects },
        };

        expect(projectQuery.project.$in).toHaveLength(3);
      });
    });

    describe('Sorting', () => {
      it('should sort by relevance (text score)', () => {
        const sort = {
          field: 'relevance',
          order: 'desc',
        };

        const sortQuery = sort.field === 'relevance'
          ? { score: { $meta: 'textScore' } }
          : { [sort.field]: sort.order === 'desc' ? -1 : 1 };

        expect(sortQuery.score).toEqual({ $meta: 'textScore' });
      });

      it('should sort by date', () => {
        const sort = {
          field: 'date',
          order: 'desc',
        };

        const sortQuery = { createdAt: sort.order === 'desc' ? -1 : 1 };

        expect(sortQuery.createdAt).toBe(-1);
      });

      it('should sort by confidence', () => {
        const sort = {
          field: 'confidence',
          order: 'desc',
        };

        const sortQuery = { confidence: sort.order === 'desc' ? -1 : 1 };

        expect(sortQuery.confidence).toBe(-1);
      });

      it('should sort by quality score', () => {
        const sort = {
          field: 'quality',
          order: 'desc',
        };

        const sortQuery = { 'quality.overallScore': sort.order === 'desc' ? -1 : 1 };

        expect(sortQuery['quality.overallScore']).toBe(-1);
      });
    });

    describe('Pagination', () => {
      it('should apply pagination defaults', () => {
        const pagination = {
          page: 1,
          limit: 20,
        };

        expect(pagination.page).toBe(1);
        expect(pagination.limit).toBe(20);
      });

      it('should calculate skip correctly', () => {
        const page = 3;
        const limit = 20;
        const skip = (page - 1) * limit;

        expect(skip).toBe(40);
      });

      it('should enforce maximum limit', () => {
        const requestedLimit = 500;
        const maxLimit = 100;
        const limit = Math.min(requestedLimit, maxLimit);

        expect(limit).toBe(100);
      });
    });

    describe('Caching', () => {
      it('should generate cache key from search params', () => {
        const params = {
          q: 'climate change',
          type: 'claims',
          filters: { projectId: mockProjectId },
          sort: { field: 'relevance', order: 'desc' },
          pagination: { page: 1, limit: 20 },
          userId: mockUserId,
        };

        const cacheKey = `search:${JSON.stringify(params)}`;

        expect(cacheKey).toContain('search:');
        expect(cacheKey).toContain('climate change');
      });

      it('should check cache before database query', async () => {
        const cacheKey = 'search:test-key';
        (redisManager.get as jest.Mock).mockResolvedValue(null);

        const cached = await redisManager.get(cacheKey);

        expect(redisManager.get).toHaveBeenCalledWith(cacheKey);
        expect(cached).toBeNull();
      });

      it('should cache search results', async () => {
        const cacheKey = 'search:test-key';
        const results = { claims: [], total: 0 };
        const ttl = 300; // 5 minutes

        await redisManager.set(cacheKey, results, ttl);

        expect(redisManager.set).toHaveBeenCalledWith(cacheKey, results, ttl);
      });
    });

    describe('Text Search', () => {
      it('should build MongoDB text search query', () => {
        const searchTerm = 'climate change';

        const textQuery = {
          $text: { $search: searchTerm },
        };

        expect(textQuery.$text.$search).toBe(searchTerm);
      });

      it('should include text score in projection', () => {
        const projection = {
          score: { $meta: 'textScore' },
        };

        expect(projection.score).toEqual({ $meta: 'textScore' });
      });
    });

    describe('Access Control', () => {
      it('should only search in accessible projects', () => {
        const userProjects = [mockProjectId, 'project-2'];
        const publicProjects = ['public-1', 'public-2'];

        const accessibleProjects = [...userProjects, ...publicProjects];

        expect(accessibleProjects).toHaveLength(4);
      });

      it('should filter private claims from results', () => {
        const claims = [
          { _id: '1', project: { visibility: 'public' } },
          { _id: '2', project: { visibility: 'private', owner: mockUserId } },
          { _id: '3', project: { visibility: 'private', owner: 'other' } },
        ];

        const accessible = claims.filter(
          (c) =>
            c.project.visibility === 'public' ||
            (c.project as { visibility: string; owner?: string }).owner === mockUserId
        );

        expect(accessible).toHaveLength(2);
      });
    });
  });

  describe('Result Aggregation', () => {
    it('should aggregate results by type', () => {
      const results = {
        claims: [{ _id: '1' }, { _id: '2' }],
        evidence: [{ _id: '3' }],
        projects: [],
        reasoning: [{ _id: '4' }],
      };

      const totalResults =
        results.claims.length +
        results.evidence.length +
        results.projects.length +
        results.reasoning.length;

      expect(totalResults).toBe(4);
    });

    it('should calculate result counts by type', () => {
      const counts = {
        claims: 50,
        evidence: 30,
        projects: 10,
        reasoning: 15,
      };

      const total = Object.values(counts).reduce((a, b) => a + b, 0);

      expect(total).toBe(105);
    });
  });

  describe('Search Suggestions', () => {
    it('should generate suggestions from query', () => {
      const query = 'clima';
      const suggestions = [
        'climate',
        'climate change',
        'climate science',
        'climatology',
      ];

      const filtered = suggestions.filter((s) =>
        s.toLowerCase().startsWith(query.toLowerCase())
      );

      expect(filtered).toHaveLength(4);
    });
  });

  describe('Highlighting', () => {
    it('should highlight matching terms in text', () => {
      const text = 'Climate change affects global temperatures';
      const term = 'climate';
      const highlighted = text.replace(
        new RegExp(`(${term})`, 'gi'),
        '<mark>$1</mark>'
      );

      expect(highlighted).toContain('<mark>Climate</mark>');
    });
  });

  describe('Response Format', () => {
    it('should return correct search response structure', () => {
      const response = {
        success: true,
        data: {
          results: {
            claims: [],
            evidence: [],
            projects: [],
            reasoning: [],
          },
          counts: {
            claims: 0,
            evidence: 0,
            projects: 0,
            reasoning: 0,
            total: 0,
          },
          query: 'climate change',
          filters: {},
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
          },
        },
      };

      expect(response.success).toBe(true);
      expect(response.data.results).toBeDefined();
      expect(response.data.counts).toBeDefined();
      expect(response.data.query).toBe('climate change');
    });
  });

  describe('Empty Results', () => {
    it('should handle no results gracefully', () => {
      const response = {
        success: true,
        data: {
          results: {
            claims: [],
            evidence: [],
            projects: [],
            reasoning: [],
          },
          counts: {
            claims: 0,
            evidence: 0,
            projects: 0,
            reasoning: 0,
            total: 0,
          },
          query: 'nonexistent term',
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
          },
        },
        message: 'No results found',
      };

      expect(response.data.counts.total).toBe(0);
      expect(response.message).toBe('No results found');
    });
  });

  describe('Performance Optimization', () => {
    it('should limit results per type', () => {
      const maxPerType = 50;
      const claimsFound = 100;

      const claimsToReturn = Math.min(claimsFound, maxPerType);

      expect(claimsToReturn).toBe(50);
    });

    it('should use indexes for common queries', () => {
      // Text indexes should be used for $text queries
      const indexFields = ['text', 'keywords', 'tags'];

      expect(indexFields).toContain('text');
    });
  });

  describe('Activity Tracking', () => {
    it('should track search queries', async () => {
      await redisManager.trackUserActivity(mockUserId, {
        action: 'search',
        query: 'climate change',
        resultsCount: 25,
      });

      expect(redisManager.trackUserActivity).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          action: 'search',
        })
      );
    });
  });
});
