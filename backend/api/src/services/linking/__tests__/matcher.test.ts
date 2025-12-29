/**
 * Tests for Premise-Evidence Matcher Service
 */

import {
  linkPremiseToEvidence,
  linkPremisesBatch,
  filterSupportingEvidence,
  filterRefutingEvidence,
  calculateCoverageStats,
  LinkedEvidence,
} from '../matcher';
import { rerank } from '../reranker';
import { classifyRelationship } from '../classifier';

// Mock the dependencies
jest.mock('../../vectorStore', () => ({
  searchByProject: jest.fn().mockResolvedValue([
    {
      id: 'evidence-1',
      score: 0.85,
      metadata: {
        text: 'Evidence text 1',
        sourceUrl: 'https://example.com/1',
        sourceTitle: 'Source 1',
      },
    },
    {
      id: 'evidence-2',
      score: 0.75,
      metadata: {
        text: 'Evidence text 2',
        sourceUrl: 'https://example.com/2',
        sourceTitle: 'Source 2',
      },
    },
  ]),
}));

jest.mock('../reranker', () => ({
  rerank: jest.fn().mockResolvedValue([
    { text: 'Evidence text 1', score: 0.9, originalIndex: 0 },
    { text: 'Evidence text 2', score: 0.7, originalIndex: 1 },
  ]),
}));

jest.mock('../classifier', () => ({
  classifyRelationship: jest.fn().mockResolvedValue({
    relationship: 'supports',
    confidence: 0.85,
    reasoning: 'Direct support',
  }),
}));

describe('Premise-Evidence Matcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('linkPremiseToEvidence', () => {
    it('should return empty result for empty premise', async () => {
      const result = await linkPremiseToEvidence('', 'project-123');

      expect(result.linkedEvidence).toHaveLength(0);
      expect(result.stats.candidatesFound).toBe(0);
    });

    it('should link premise to evidence through the pipeline', async () => {
      const result = await linkPremiseToEvidence(
        'The climate is changing due to human activity',
        'project-123'
      );

      expect(result.premise).toBe('The climate is changing due to human activity');
      expect(result.projectId).toBe('project-123');
      expect(result.linkedEvidence.length).toBeGreaterThanOrEqual(0);
      expect(result.stats.processingTimeMs).toBeGreaterThan(0);
    });

    it('should respect skipReranking option', async () => {
      await linkPremiseToEvidence('Test premise', 'project-123', {
        skipReranking: true,
      });

      expect(rerank).not.toHaveBeenCalled();
    });

    it('should respect skipClassification option', async () => {
      await linkPremiseToEvidence('Test premise', 'project-123', {
        skipClassification: true,
      });

      expect(classifyRelationship).not.toHaveBeenCalled();
    });
  });

  describe('linkPremisesBatch', () => {
    it('should return empty array for empty input', async () => {
      const results = await linkPremisesBatch([], 'project-123');
      expect(results).toHaveLength(0);
    });

    it('should process multiple premises', async () => {
      const premises = ['Premise 1', 'Premise 2'];
      const results = await linkPremisesBatch(premises, 'project-123');

      expect(results).toHaveLength(2);
      results.forEach((result, i) => {
        expect(result.premise).toBe(premises[i]);
      });
    });
  });

  describe('filterSupportingEvidence', () => {
    const evidence: LinkedEvidence[] = [
      {
        evidenceId: '1',
        evidenceText: 'Text 1',
        relationship: 'supports',
        confidence: 0.9,
        vectorScore: 0.85,
        rerankScore: 0.9,
      },
      {
        evidenceId: '2',
        evidenceText: 'Text 2',
        relationship: 'refutes',
        confidence: 0.8,
        vectorScore: 0.75,
        rerankScore: 0.8,
      },
      {
        evidenceId: '3',
        evidenceText: 'Text 3',
        relationship: 'partial_support',
        confidence: 0.7,
        vectorScore: 0.65,
        rerankScore: 0.7,
      },
      {
        evidenceId: '4',
        evidenceText: 'Text 4',
        relationship: 'neutral',
        confidence: 0.5,
        vectorScore: 0.55,
        rerankScore: 0.5,
      },
    ];

    it('should filter only supporting evidence', () => {
      const supporting = filterSupportingEvidence(evidence);

      expect(supporting).toHaveLength(2);
      expect(supporting.map((e) => e.relationship)).toEqual(['supports', 'partial_support']);
    });
  });

  describe('filterRefutingEvidence', () => {
    const evidence: LinkedEvidence[] = [
      {
        evidenceId: '1',
        evidenceText: 'Text 1',
        relationship: 'refutes',
        confidence: 0.9,
        vectorScore: 0.85,
        rerankScore: 0.9,
      },
      {
        evidenceId: '2',
        evidenceText: 'Text 2',
        relationship: 'supports',
        confidence: 0.8,
        vectorScore: 0.75,
        rerankScore: 0.8,
      },
      {
        evidenceId: '3',
        evidenceText: 'Text 3',
        relationship: 'partial_refute',
        confidence: 0.7,
        vectorScore: 0.65,
        rerankScore: 0.7,
      },
    ];

    it('should filter only refuting evidence', () => {
      const refuting = filterRefutingEvidence(evidence);

      expect(refuting).toHaveLength(2);
      expect(refuting.map((e) => e.relationship)).toEqual(['refutes', 'partial_refute']);
    });
  });

  describe('calculateCoverageStats', () => {
    it('should return zeros for empty evidence array', () => {
      const stats = calculateCoverageStats([]);

      expect(stats.supportCount).toBe(0);
      expect(stats.refuteCount).toBe(0);
      expect(stats.neutralCount).toBe(0);
      expect(stats.hasEvidence).toBe(false);
      expect(stats.netSupport).toBe(0);
      expect(stats.averageConfidence).toBe(0);
    });

    it('should calculate correct statistics', () => {
      const evidence: LinkedEvidence[] = [
        {
          evidenceId: '1',
          evidenceText: 'Text 1',
          relationship: 'supports',
          confidence: 0.9,
          vectorScore: 0.85,
          rerankScore: 0.9,
        },
        {
          evidenceId: '2',
          evidenceText: 'Text 2',
          relationship: 'supports',
          confidence: 0.8,
          vectorScore: 0.75,
          rerankScore: 0.8,
        },
        {
          evidenceId: '3',
          evidenceText: 'Text 3',
          relationship: 'refutes',
          confidence: 0.7,
          vectorScore: 0.65,
          rerankScore: 0.7,
        },
        {
          evidenceId: '4',
          evidenceText: 'Text 4',
          relationship: 'neutral',
          confidence: 0.5,
          vectorScore: 0.55,
          rerankScore: 0.5,
        },
      ];

      const stats = calculateCoverageStats(evidence);

      expect(stats.supportCount).toBe(2);
      expect(stats.refuteCount).toBe(1);
      expect(stats.neutralCount).toBe(1);
      expect(stats.hasEvidence).toBe(true);
      expect(stats.netSupport).toBe(1); // 2 supports - 1 refutes
      expect(stats.averageConfidence).toBeCloseTo(0.725); // (0.9 + 0.8 + 0.7 + 0.5) / 4
    });

    it('should count partial_support as supporting', () => {
      const evidence: LinkedEvidence[] = [
        {
          evidenceId: '1',
          evidenceText: 'Text 1',
          relationship: 'partial_support',
          confidence: 0.7,
          vectorScore: 0.65,
          rerankScore: 0.7,
        },
      ];

      const stats = calculateCoverageStats(evidence);
      expect(stats.supportCount).toBe(1);
    });

    it('should count partial_refute as refuting', () => {
      const evidence: LinkedEvidence[] = [
        {
          evidenceId: '1',
          evidenceText: 'Text 1',
          relationship: 'partial_refute',
          confidence: 0.7,
          vectorScore: 0.65,
          rerankScore: 0.7,
        },
      ];

      const stats = calculateCoverageStats(evidence);
      expect(stats.refuteCount).toBe(1);
    });
  });
});
