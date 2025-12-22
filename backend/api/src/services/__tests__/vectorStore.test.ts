/**
 * Vector Store Tests
 *
 * Tests for Pinecone vector database operations.
 * Uses mocks to avoid hitting the actual Pinecone API.
 */

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

describe('Vector Store Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when vector DB is disabled', () => {
    it('should skip upsert operations silently', async () => {
      const { upsertEvidence } = await import('../vectorStore');
      const { isVectorDbEnabled } = await import('../../config/vectordb');
      (isVectorDbEnabled as jest.Mock).mockReturnValue(false);

      // Should not throw
      await expect(
        upsertEvidence({
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
        })
      ).resolves.toBeUndefined();
    });

    it('should return empty results for search', async () => {
      const { searchSimilar } = await import('../vectorStore');
      const { isVectorDbEnabled } = await import('../../config/vectordb');
      (isVectorDbEnabled as jest.Mock).mockReturnValue(false);

      const results = await searchSimilar('test query');
      expect(results).toEqual([]);
    });

    it('should return empty results for searchByProject', async () => {
      const { searchByProject } = await import('../vectorStore');
      const { isVectorDbEnabled } = await import('../../config/vectordb');
      (isVectorDbEnabled as jest.Mock).mockReturnValue(false);

      const results = await searchByProject('test query', 'project-123');
      expect(results).toEqual([]);
    });

    it('should skip delete operations silently', async () => {
      const { deleteEvidence } = await import('../vectorStore');
      const { isVectorDbEnabled } = await import('../../config/vectordb');
      (isVectorDbEnabled as jest.Mock).mockReturnValue(false);

      await expect(deleteEvidence('test-id')).resolves.toBeUndefined();
    });

    it('should return null for getVectorStats', async () => {
      const { getVectorStats } = await import('../vectorStore');
      const { isVectorDbEnabled } = await import('../../config/vectordb');
      (isVectorDbEnabled as jest.Mock).mockReturnValue(false);

      const stats = await getVectorStats();
      expect(stats).toBeNull();
    });

    it('should return not duplicate when checking duplicates', async () => {
      const { checkDuplicate } = await import('../vectorStore');
      const { isVectorDbEnabled } = await import('../../config/vectordb');
      (isVectorDbEnabled as jest.Mock).mockReturnValue(false);

      const result = await checkDuplicate('test text', 'project-123');
      expect(result.isDuplicate).toBe(false);
    });
  });

  describe('batch operations', () => {
    it('should handle empty batch gracefully', async () => {
      const { upsertEvidenceBatch } = await import('../vectorStore');
      const { isVectorDbEnabled } = await import('../../config/vectordb');
      (isVectorDbEnabled as jest.Mock).mockReturnValue(false);

      const result = await upsertEvidenceBatch([]);
      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should skip batch with empty texts', async () => {
      const { upsertEvidenceBatch } = await import('../vectorStore');
      const { isVectorDbEnabled } = await import('../../config/vectordb');
      (isVectorDbEnabled as jest.Mock).mockReturnValue(false);

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
      const { deleteEvidenceBatch } = await import('../vectorStore');
      const { isVectorDbEnabled } = await import('../../config/vectordb');
      (isVectorDbEnabled as jest.Mock).mockReturnValue(false);

      const result = await deleteEvidenceBatch(['id-1', 'id-2']);
      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  describe('empty query handling', () => {
    it('should return empty for empty query string', async () => {
      const { searchSimilar } = await import('../vectorStore');
      const { isVectorDbEnabled } = await import('../../config/vectordb');
      (isVectorDbEnabled as jest.Mock).mockReturnValue(true);

      const results = await searchSimilar('');
      expect(results).toEqual([]);
    });

    it('should return empty for whitespace-only query', async () => {
      const { searchSimilar } = await import('../vectorStore');
      const { isVectorDbEnabled } = await import('../../config/vectordb');
      (isVectorDbEnabled as jest.Mock).mockReturnValue(true);

      const results = await searchSimilar('   ');
      expect(results).toEqual([]);
    });
  });
});
