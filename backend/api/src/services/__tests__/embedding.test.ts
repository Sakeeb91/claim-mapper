/**
 * Embedding Service Tests
 *
 * Tests for OpenAI embedding generation functionality.
 * Uses mocks to avoid hitting the actual OpenAI API.
 */

import { cosineSimilarity, EMBEDDING_CONFIG } from '../embedding';

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    embeddings: {
      create: jest.fn().mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0.1) }],
      }),
    },
  }));
});

describe('Embedding Service', () => {
  describe('EMBEDDING_CONFIG', () => {
    it('should have correct model configuration', () => {
      expect(EMBEDDING_CONFIG.model).toBe('text-embedding-3-large');
      expect(EMBEDDING_CONFIG.dimensions).toBe(1536);
    });

    it('should have reasonable limits', () => {
      expect(EMBEDDING_CONFIG.maxInputLength).toBeGreaterThan(0);
      expect(EMBEDDING_CONFIG.batchSize).toBeLessThanOrEqual(100);
    });
  });

  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const vector = [0.5, 0.5, 0.5, 0.5];
      const similarity = cosineSimilarity(vector, vector);
      expect(similarity).toBeCloseTo(1, 5);
    });

    it('should return 0 for orthogonal vectors', () => {
      const vectorA = [1, 0];
      const vectorB = [0, 1];
      const similarity = cosineSimilarity(vectorA, vectorB);
      expect(similarity).toBeCloseTo(0, 5);
    });

    it('should return -1 for opposite vectors', () => {
      const vectorA = [1, 0];
      const vectorB = [-1, 0];
      const similarity = cosineSimilarity(vectorA, vectorB);
      expect(similarity).toBeCloseTo(-1, 5);
    });

    it('should throw for vectors of different dimensions', () => {
      const vectorA = [1, 0, 0];
      const vectorB = [1, 0];
      expect(() => cosineSimilarity(vectorA, vectorB)).toThrow(
        'Embedding vectors must have the same dimensions'
      );
    });

    it('should handle zero vectors', () => {
      const vectorA = [0, 0, 0];
      const vectorB = [1, 0, 0];
      const similarity = cosineSimilarity(vectorA, vectorB);
      expect(similarity).toBe(0);
    });

    it('should calculate similarity correctly for typical embeddings', () => {
      // Simulate two somewhat similar vectors
      const vectorA = [0.8, 0.2, 0.1, 0.5];
      const vectorB = [0.7, 0.3, 0.2, 0.4];
      const similarity = cosineSimilarity(vectorA, vectorB);

      // Should be high but not perfect
      expect(similarity).toBeGreaterThan(0.9);
      expect(similarity).toBeLessThan(1);
    });
  });
});
