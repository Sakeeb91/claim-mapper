/**
 * Tests for reasoningChainToGraph transformer
 */

import { reasoningChainToGraph } from '../reasoningChainToGraph';
import { ReasoningChain } from '@/types';

// Mock reasoning chain for testing
const createMockChain = (overrides: Partial<ReasoningChain> = {}): ReasoningChain => ({
  id: 'chain-1',
  claimId: 'claim-1',
  type: 'deductive',
  steps: [
    { id: 'step-1', text: 'First premise', type: 'premise', order: 1, confidence: 0.9 },
    { id: 'step-2', text: 'Second premise', type: 'premise', order: 2, confidence: 0.85 },
    { id: 'step-3', text: 'Inference from premises', type: 'inference', order: 3, confidence: 0.75 },
    { id: 'step-4', text: 'Final conclusion', type: 'conclusion', order: 4, confidence: 0.8 },
  ],
  ...overrides,
} as ReasoningChain);

describe('reasoningChainToGraph', () => {
  describe('node creation', () => {
    it('should create a node for each step in the chain', () => {
      const chain = createMockChain();
      const result = reasoningChainToGraph(chain, 'claim-1');

      expect(result.nodes).toHaveLength(4);
    });

    it('should assign correct node types', () => {
      const chain = createMockChain();
      const result = reasoningChainToGraph(chain, 'claim-1');

      result.nodes.forEach((node) => {
        expect(node.type).toBe('reasoning');
      });
    });

    it('should assign correct subtypes based on step type', () => {
      const chain = createMockChain();
      const result = reasoningChainToGraph(chain, 'claim-1');

      expect(result.nodes[0].subtype).toBe('premise');
      expect(result.nodes[1].subtype).toBe('premise');
      expect(result.nodes[2].subtype).toBe('inference');
      expect(result.nodes[3].subtype).toBe('conclusion');
    });

    it('should assign correct hierarchical levels', () => {
      const chain = createMockChain();
      const result = reasoningChainToGraph(chain, 'claim-1');

      // Premises are level 0
      expect(result.nodes[0].level).toBe(0);
      expect(result.nodes[1].level).toBe(0);
      // Inferences are level 1
      expect(result.nodes[2].level).toBe(1);
      // Conclusions are level 2
      expect(result.nodes[3].level).toBe(2);
    });

    it('should assign step numbers', () => {
      const chain = createMockChain();
      const result = reasoningChainToGraph(chain, 'claim-1');

      expect(result.nodes[0].stepNumber).toBe(1);
      expect(result.nodes[1].stepNumber).toBe(2);
      expect(result.nodes[2].stepNumber).toBe(3);
      expect(result.nodes[3].stepNumber).toBe(4);
    });

    it('should assign chain ID to nodes', () => {
      const chain = createMockChain();
      const result = reasoningChainToGraph(chain, 'claim-1');

      result.nodes.forEach((node) => {
        expect(node.chainId).toBe('chain-1');
      });
    });

    it('should truncate long labels', () => {
      const longText = 'A'.repeat(100);
      const chain = createMockChain({
        steps: [
          { id: 'step-1', text: longText, type: 'premise', order: 1, confidence: 0.9 },
        ],
      });

      const result = reasoningChainToGraph(chain, 'claim-1', { maxLabelLength: 50 });

      expect(result.nodes[0].label.length).toBeLessThanOrEqual(53); // 50 + '...'
      expect(result.nodes[0].label.endsWith('...')).toBe(true);
    });
  });

  describe('link creation', () => {
    it('should create sequential links when no dependencies exist', () => {
      const chain = createMockChain();
      const result = reasoningChainToGraph(chain, 'claim-1');

      // 3 sequential links + 1 conclusion-to-claim link
      const flowLinks = result.links.filter((l) => l.data?.isLogicalFlow);
      expect(flowLinks.length).toBeGreaterThanOrEqual(3);
    });

    it('should mark logical flow links', () => {
      const chain = createMockChain();
      const result = reasoningChainToGraph(chain, 'claim-1');

      const flowLinks = result.links.filter((l) => l.data?.isLogicalFlow);
      expect(flowLinks.length).toBeGreaterThan(0);
    });

    it('should create conclusion-to-claim link when enabled', () => {
      const chain = createMockChain();
      const result = reasoningChainToGraph(chain, 'claim-1', {
        includeConclusionToClaimLink: true,
      });

      const conclusionLink = result.links.find(
        (l) => l.data?.relationship === 'concludes'
      );
      expect(conclusionLink).toBeDefined();
      expect(conclusionLink?.target).toBe('claim-1');
    });

    it('should not create conclusion-to-claim link when disabled', () => {
      const chain = createMockChain();
      const result = reasoningChainToGraph(chain, 'claim-1', {
        includeConclusionToClaimLink: false,
      });

      const conclusionLink = result.links.find(
        (l) => l.data?.relationship === 'concludes'
      );
      expect(conclusionLink).toBeUndefined();
    });
  });

  describe('metadata', () => {
    it('should return correct chain metadata', () => {
      const chain = createMockChain();
      const result = reasoningChainToGraph(chain, 'claim-1');

      expect(result.chainId).toBe('chain-1');
      expect(result.chainType).toBe('deductive');
      expect(result.stepCount).toBe(4);
    });

    it('should respect layout option', () => {
      const chain = createMockChain();

      const hierarchical = reasoningChainToGraph(chain, 'claim-1', { layout: 'hierarchical' });
      const force = reasoningChainToGraph(chain, 'claim-1', { layout: 'force' });

      expect(hierarchical.layout).toBe('hierarchical');
      expect(force.layout).toBe('force');
    });
  });

  describe('edge cases', () => {
    it('should handle empty steps array', () => {
      const chain = createMockChain({ steps: [] });
      const result = reasoningChainToGraph(chain, 'claim-1');

      expect(result.nodes).toHaveLength(0);
      expect(result.links).toHaveLength(0);
    });

    it('should handle single step chain', () => {
      const chain = createMockChain({
        steps: [{ id: 'step-1', text: 'Only step', type: 'conclusion', order: 1, confidence: 0.9 }],
      });
      const result = reasoningChainToGraph(chain, 'claim-1');

      expect(result.nodes).toHaveLength(1);
      // Should still create conclusion-to-claim link
      const conclusionLink = result.links.find((l) => l.data?.relationship === 'concludes');
      expect(conclusionLink).toBeDefined();
    });

    it('should handle chain without conclusions', () => {
      const chain = createMockChain({
        steps: [
          { id: 'step-1', text: 'Premise 1', type: 'premise', order: 1, confidence: 0.9 },
          { id: 'step-2', text: 'Inference 1', type: 'inference', order: 2, confidence: 0.8 },
        ],
      });
      const result = reasoningChainToGraph(chain, 'claim-1');

      // Should use last step as conclusion link source
      const conclusionLink = result.links.find((l) => l.data?.relationship === 'concludes');
      expect(conclusionLink).toBeDefined();
    });
  });
});
