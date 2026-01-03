/**
 * Tests for hierarchicalLayout functions
 */

import {
  applyHierarchicalLayout,
  releaseHierarchicalPositions,
  isReasoningLayoutNode,
  partitionNodesByLayoutType,
  applyHybridLayout,
} from '../hierarchicalLayout';
import { GraphNode, GraphLink } from '@/types';

// Mock node factory
const createMockNode = (overrides: Partial<GraphNode> = {}): GraphNode => ({
  id: 'node-1',
  type: 'reasoning',
  label: 'Test node',
  size: 15,
  color: '#000',
  data: {} as any,
  ...overrides,
});

describe('hierarchicalLayout', () => {
  describe('isReasoningLayoutNode', () => {
    it('should return true for reasoning nodes with level', () => {
      const node = createMockNode({ type: 'reasoning', level: 0 });
      expect(isReasoningLayoutNode(node)).toBe(true);
    });

    it('should return false for non-reasoning nodes', () => {
      const node = createMockNode({ type: 'claim', level: 0 });
      expect(isReasoningLayoutNode(node)).toBe(false);
    });

    it('should return false for reasoning nodes without level', () => {
      const node = createMockNode({ type: 'reasoning' });
      expect(isReasoningLayoutNode(node)).toBe(false);
    });
  });

  describe('partitionNodesByLayoutType', () => {
    it('should separate reasoning and non-reasoning nodes', () => {
      const nodes: GraphNode[] = [
        createMockNode({ id: '1', type: 'reasoning', level: 0 }),
        createMockNode({ id: '2', type: 'claim' }),
        createMockNode({ id: '3', type: 'reasoning', level: 1 }),
        createMockNode({ id: '4', type: 'evidence' }),
      ];

      const result = partitionNodesByLayoutType(nodes);

      expect(result.hierarchical).toHaveLength(2);
      expect(result.forceDirected).toHaveLength(2);
    });

    it('should handle empty array', () => {
      const result = partitionNodesByLayoutType([]);

      expect(result.hierarchical).toHaveLength(0);
      expect(result.forceDirected).toHaveLength(0);
    });

    it('should handle all reasoning nodes', () => {
      const nodes: GraphNode[] = [
        createMockNode({ id: '1', type: 'reasoning', level: 0 }),
        createMockNode({ id: '2', type: 'reasoning', level: 1 }),
      ];

      const result = partitionNodesByLayoutType(nodes);

      expect(result.hierarchical).toHaveLength(2);
      expect(result.forceDirected).toHaveLength(0);
    });
  });

  describe('applyHierarchicalLayout', () => {
    const defaultConfig = {
      width: 800,
      height: 600,
      marginX: 50,
      marginY: 50,
      minNodeSpacing: 100,
      fixPositions: true,
    };

    it('should position level 0 nodes at the top', () => {
      const nodes: GraphNode[] = [
        createMockNode({ id: '1', type: 'reasoning', level: 0, subtype: 'premise' }),
      ];

      const result = applyHierarchicalLayout(nodes, [], defaultConfig);

      expect(result[0].y).toBeLessThan(300); // Above middle
    });

    it('should position level 2 nodes at the bottom', () => {
      const nodes: GraphNode[] = [
        createMockNode({ id: '1', type: 'reasoning', level: 2, subtype: 'conclusion' }),
      ];

      const result = applyHierarchicalLayout(nodes, [], defaultConfig);

      expect(result[0].y).toBeGreaterThan(300); // Below middle
    });

    it('should position level 1 nodes in the middle', () => {
      const nodes: GraphNode[] = [
        createMockNode({ id: '1', type: 'reasoning', level: 1, subtype: 'inference' }),
      ];

      const result = applyHierarchicalLayout(nodes, [], defaultConfig);

      // Should be roughly in the middle
      expect(result[0].y).toBeGreaterThan(150);
      expect(result[0].y).toBeLessThan(450);
    });

    it('should fix node positions when configured', () => {
      const nodes: GraphNode[] = [
        createMockNode({ id: '1', type: 'reasoning', level: 0 }),
      ];

      const result = applyHierarchicalLayout(nodes, [], { ...defaultConfig, fixPositions: true });

      expect(result[0].fx).toBeDefined();
      expect(result[0].fy).toBeDefined();
      expect(result[0].fx).toBe(result[0].x);
      expect(result[0].fy).toBe(result[0].y);
    });

    it('should not fix positions when disabled', () => {
      const nodes: GraphNode[] = [
        createMockNode({ id: '1', type: 'reasoning', level: 0 }),
      ];

      const result = applyHierarchicalLayout(nodes, [], { ...defaultConfig, fixPositions: false });

      // fx and fy should not be set to match x and y
      expect(result[0].fx).toBeUndefined();
    });

    it('should leave non-reasoning nodes unpositioned', () => {
      const nodes: GraphNode[] = [
        createMockNode({ id: '1', type: 'claim' }),
      ];

      const result = applyHierarchicalLayout(nodes, [], defaultConfig);

      // Non-reasoning nodes should not have positions set
      expect(result[0].x).toBeUndefined();
      expect(result[0].y).toBeUndefined();
    });

    it('should distribute multiple nodes at same level horizontally', () => {
      const nodes: GraphNode[] = [
        createMockNode({ id: '1', type: 'reasoning', level: 0 }),
        createMockNode({ id: '2', type: 'reasoning', level: 0 }),
        createMockNode({ id: '3', type: 'reasoning', level: 0 }),
      ];

      const result = applyHierarchicalLayout(nodes, [], defaultConfig);

      // All should have same Y
      expect(result[0].y).toBe(result[1].y);
      expect(result[1].y).toBe(result[2].y);

      // X should be different
      expect(result[0].x).not.toBe(result[1].x);
      expect(result[1].x).not.toBe(result[2].x);
    });
  });

  describe('releaseHierarchicalPositions', () => {
    it('should clear fx and fy for reasoning nodes', () => {
      const nodes: GraphNode[] = [
        createMockNode({ id: '1', type: 'reasoning', fx: 100, fy: 100 }),
        createMockNode({ id: '2', type: 'reasoning', fx: 200, fy: 200 }),
      ];

      const result = releaseHierarchicalPositions(nodes);

      expect(result[0].fx).toBeNull();
      expect(result[0].fy).toBeNull();
      expect(result[1].fx).toBeNull();
      expect(result[1].fy).toBeNull();
    });

    it('should not affect non-reasoning nodes', () => {
      const nodes: GraphNode[] = [
        createMockNode({ id: '1', type: 'claim', fx: 100, fy: 100 }),
      ];

      const result = releaseHierarchicalPositions(nodes);

      // Should still have fx and fy
      expect(result[0].fx).toBe(100);
      expect(result[0].fy).toBe(100);
    });
  });

  describe('applyHybridLayout', () => {
    const defaultConfig = {
      width: 800,
      height: 600,
    };

    it('should apply hierarchical layout when enabled', () => {
      const nodes: GraphNode[] = [
        createMockNode({ id: '1', type: 'reasoning', level: 0 }),
      ];

      const result = applyHybridLayout(nodes, [], defaultConfig, true);

      expect(result[0].x).toBeDefined();
      expect(result[0].y).toBeDefined();
    });

    it('should release positions when hierarchical is disabled', () => {
      const nodes: GraphNode[] = [
        createMockNode({ id: '1', type: 'reasoning', level: 0, fx: 100, fy: 100 }),
      ];

      const result = applyHybridLayout(nodes, [], defaultConfig, false);

      expect(result[0].fx).toBeNull();
      expect(result[0].fy).toBeNull();
    });
  });
});
