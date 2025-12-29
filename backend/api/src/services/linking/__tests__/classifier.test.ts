/**
 * Tests for Relationship Classifier Service
 */

import {
  classifyRelationship,
  classifyRelationshipsBatch,
  isClassifierEnabled,
} from '../classifier';

// Mock environment variables
const originalEnv = process.env;

describe('Relationship Classifier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isClassifierEnabled', () => {
    it('should return true when ANTHROPIC_API_KEY is set', () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      process.env.OPENAI_API_KEY = '';
      expect(isClassifierEnabled()).toBe(true);
    });

    it('should return true when OPENAI_API_KEY is set', () => {
      process.env.ANTHROPIC_API_KEY = '';
      process.env.OPENAI_API_KEY = 'test-key';
      expect(isClassifierEnabled()).toBe(true);
    });

    it('should return false when no API keys are set', () => {
      process.env.ANTHROPIC_API_KEY = '';
      process.env.OPENAI_API_KEY = '';
      expect(isClassifierEnabled()).toBe(false);
    });
  });

  describe('classifyRelationship', () => {
    it('should return neutral for empty premise', async () => {
      const result = await classifyRelationship('', 'Some evidence');
      expect(result.relationship).toBe('neutral');
      expect(result.confidence).toBe(0);
    });

    it('should return neutral for empty evidence', async () => {
      const result = await classifyRelationship('Some premise', '');
      expect(result.relationship).toBe('neutral');
      expect(result.confidence).toBe(0);
    });

    it('should return neutral with low confidence when no API keys are set', async () => {
      process.env.ANTHROPIC_API_KEY = '';
      process.env.OPENAI_API_KEY = '';

      const result = await classifyRelationship(
        'The Earth is round',
        'Scientific measurements confirm the spherical shape of our planet'
      );

      // Without API keys, it should fall back to neutral
      expect(result.relationship).toBe('neutral');
      expect(result.confidence).toBeLessThanOrEqual(0.5);
    });
  });

  describe('classifyRelationshipsBatch', () => {
    it('should return empty array for empty input', async () => {
      const result = await classifyRelationshipsBatch([]);
      expect(result).toEqual([]);
    });

    it('should process multiple pairs and return results', async () => {
      process.env.ANTHROPIC_API_KEY = '';
      process.env.OPENAI_API_KEY = '';

      const pairs = [
        { premise: '', evidence: 'Evidence 1' },
        { premise: 'Premise 2', evidence: '' },
      ];

      const results = await classifyRelationshipsBatch(pairs);

      expect(results).toHaveLength(2);
      results.forEach((result) => {
        expect(result.relationship).toBe('neutral');
        expect(result.confidence).toBe(0);
      });
    });
  });

  describe('relationship types', () => {
    it('should have valid relationship type in result', async () => {
      const result = await classifyRelationship('premise', 'evidence');
      const validTypes = ['supports', 'refutes', 'partial_support', 'partial_refute', 'neutral'];
      expect(validTypes).toContain(result.relationship);
    });

    it('should have confidence between 0 and 1', async () => {
      const result = await classifyRelationship('premise', 'evidence');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
});
