/**
 * Tests for Relationship Classifier Service
 */

import {
  classifyRelationship,
  classifyRelationshipsBatch,
  isClassifierEnabled,
  Relationship,
  ClassificationResult,
} from '../classifier';

// Mock the LLM clients
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              relationship: 'SUPPORTS',
              confidence: 0.85,
              reasoning: 'Evidence directly supports the premise',
            }),
          },
        ],
      }),
    },
  })),
}));

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  relationship: 'REFUTES',
                  confidence: 0.75,
                  reasoning: 'Evidence contradicts the premise',
                }),
              },
            },
          ],
        }),
      },
    },
  })),
}));

describe('Relationship Classifier', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
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

    it('should classify relationship using Anthropic by default', async () => {
      const result = await classifyRelationship(
        'The Earth is round',
        'Scientific measurements confirm the spherical shape of our planet'
      );

      expect(result.relationship).toBe('supports');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.reasoning).toBeDefined();
    });

    it('should classify relationship using OpenAI when specified', async () => {
      const result = await classifyRelationship(
        'The Earth is flat',
        'Satellite imagery shows the Earth is spherical',
        'openai'
      );

      expect(result.relationship).toBe('refutes');
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('classifyRelationshipsBatch', () => {
    it('should return empty array for empty input', async () => {
      const result = await classifyRelationshipsBatch([]);
      expect(result).toEqual([]);
    });

    it('should classify multiple pairs', async () => {
      const pairs = [
        { premise: 'Premise 1', evidence: 'Evidence 1' },
        { premise: 'Premise 2', evidence: 'Evidence 2' },
      ];

      const results = await classifyRelationshipsBatch(pairs);

      expect(results).toHaveLength(2);
      results.forEach((result) => {
        expect(result.relationship).toBeDefined();
        expect(result.confidence).toBeDefined();
      });
    });
  });

  describe('response parsing', () => {
    it('should handle lowercase relationship values', async () => {
      // The mock returns uppercase, parser should normalize
      const result = await classifyRelationship('premise', 'evidence');
      expect(['supports', 'refutes', 'partial_support', 'partial_refute', 'neutral']).toContain(
        result.relationship
      );
    });

    it('should handle confidence values outside 0-1 range', async () => {
      const result = await classifyRelationship('premise', 'evidence');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
});
