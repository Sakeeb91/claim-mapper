/**
 * Vector Store Tests
 *
 * Tests for Pinecone vector database operations.
 * Uses mocks to avoid hitting the actual Pinecone API.
 */

import {
  upsertEvidence,
  upsertEvidenceBatch,
  searchSimilar,
  searchByProject,
  deleteEvidence,
  deleteEvidenceBatch,
  getVectorStats,
  checkDuplicate,
} from '../vectorStore';
import { isVectorDbEnabled } from '../../config/vectordb';

// Mock the entire vectordb config module
jest.mock('../../config/vectordb', () => ({
  isVectorDbEnabled: jest.fn().mockReturnValue(false),
  getEvidenceIndex: jest.fn(),
  VECTOR_CONFIG: {
    dimensions: 1536,
    metric: 'cosine',
    indexName: 'test-index',
    namespace: 'test',
  },
}));

// Mock the embedding module
jest.mock('../embedding', () => ({
  generateEmbedding: jest.fn().mockResolvedValue(new Array(1536).fill(0.1)),
  generateEmbeddings: jest.fn().mockResolvedValue([new Array(1536).fill(0.1)]),
  isEmbeddingEnabled: jest.fn().mockReturnValue(false),
}));

// Mock the logger to avoid console noise
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Vector Store Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default to disabled
    (isVectorDbEnabled as jest.Mock).mockReturnValue(false);
  });

  describe('when vector DB is disabled', () => {
    it('should skip upsert operations silently', async () => {
      const result = await upsertEvidence({
        id: 'test-id',
        text: 'Test evidence text',
        metadata: {
          evidenceType: 'empirical',
          sourceType: 'document',
          sourceUrl: 'https://example.com',
          sourceTitle: 'Test Source',
          projectId: 'project-123',
          createdAt: new Date().toISOString(),
          reliabilityScore: 0.8,
          keywords: ['test'],
        },
      });

      expect(result).toBeUndefined();
    });

    it('should return empty results for search', async () => {
      const results = await searchSimilar('test query');
      expect(results).toEqual([]);
    });

    it('should return empty results for searchByProject', async () => {
      const results = await searchByProject('test query', 'project-123');
      expect(results).toEqual([]);
    });

    it('should skip delete operations silently', async () => {
      const result = await deleteEvidence('test-id');
      expect(result).toBeUndefined();
    });

    it('should return null for getVectorStats', async () => {
      const stats = await getVectorStats();
      expect(stats).toBeNull();
    });

    it('should return not duplicate when checking duplicates', async () => {
      const result = await checkDuplicate('test text', 'project-123');
      expect(result.isDuplicate).toBe(false);
    });
  });

  describe('batch operations', () => {
    it('should handle empty batch gracefully', async () => {
      const result = await upsertEvidenceBatch([]);
      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should skip batch with empty texts', async () => {
      const result = await upsertEvidenceBatch([
        {
          id: 'test-1',
          text: '',
          metadata: {
            evidenceType: 'empirical',
            sourceType: 'document',
            sourceUrl: '',
            sourceTitle: '',
            projectId: 'project-123',
            createdAt: new Date().toISOString(),
            reliabilityScore: 0,
            keywords: [],
          },
        },
      ]);

      expect(result.success).toBe(0);
    });

    it('should report batch delete results', async () => {
      const result = await deleteEvidenceBatch(['id-1', 'id-2']);
      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  describe('empty query handling', () => {
    beforeEach(() => {
      // Enable vector DB for these tests but test empty query handling
      (isVectorDbEnabled as jest.Mock).mockReturnValue(true);
    });

    it('should return empty for empty query string', async () => {
      const results = await searchSimilar('');
      expect(results).toEqual([]);
    });

    it('should return empty for whitespace-only query', async () => {
      const results = await searchSimilar('   ');
      expect(results).toEqual([]);
    });
  });
});
