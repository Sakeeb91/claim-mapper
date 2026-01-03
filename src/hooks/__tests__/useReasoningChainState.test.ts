/**
 * Tests for useReasoningChainState hook
 */

import { renderHook, act } from '@testing-library/react';
import { useReasoningChainState } from '../useReasoningChainState';
import { ReasoningChain, GraphNode } from '@/types';

// Mock reasoning chain
const mockChain: ReasoningChain = {
  id: 'chain-1',
  claimId: 'claim-1',
  type: 'deductive',
  steps: [
    { id: 's1', text: 'Premise', type: 'premise', order: 1, confidence: 0.9 },
    { id: 's2', text: 'Conclusion', type: 'conclusion', order: 2, confidence: 0.8 },
  ],
} as ReasoningChain;

const mockNode: GraphNode = {
  id: 'node-1',
  type: 'reasoning',
  label: 'Test',
  size: 15,
  color: '#000',
  data: {} as any,
  subtype: 'premise',
  level: 0,
  stepNumber: 1,
  chainId: 'chain-1',
};

describe('useReasoningChainState', () => {
  describe('initial state', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() =>
        useReasoningChainState([mockChain])
      );

      expect(result.current.state.highlightedChainId).toBeNull();
      expect(result.current.state.showOverlay).toBe(true);
      expect(result.current.state.useHierarchicalLayout).toBe(true);
      expect(result.current.state.hoveredNode).toBeNull();
      expect(result.current.state.showTooltip).toBe(false);
    });

    it('should respect initial options', () => {
      const { result } = renderHook(() =>
        useReasoningChainState([mockChain], {
          initialShowOverlay: false,
          initialUseHierarchicalLayout: false,
        })
      );

      expect(result.current.state.showOverlay).toBe(false);
      expect(result.current.state.useHierarchicalLayout).toBe(false);
    });
  });

  describe('setHighlightedChain', () => {
    it('should set highlighted chain ID', () => {
      const { result } = renderHook(() =>
        useReasoningChainState([mockChain])
      );

      act(() => {
        result.current.setHighlightedChain('chain-1');
      });

      expect(result.current.state.highlightedChainId).toBe('chain-1');
    });

    it('should clear highlighted chain when set to null', () => {
      const { result } = renderHook(() =>
        useReasoningChainState([mockChain])
      );

      act(() => {
        result.current.setHighlightedChain('chain-1');
      });

      act(() => {
        result.current.setHighlightedChain(null);
      });

      expect(result.current.state.highlightedChainId).toBeNull();
    });
  });

  describe('toggleOverlay', () => {
    it('should toggle overlay visibility', () => {
      const { result } = renderHook(() =>
        useReasoningChainState([mockChain])
      );

      expect(result.current.state.showOverlay).toBe(true);

      act(() => {
        result.current.toggleOverlay();
      });

      expect(result.current.state.showOverlay).toBe(false);

      act(() => {
        result.current.toggleOverlay();
      });

      expect(result.current.state.showOverlay).toBe(true);
    });
  });

  describe('toggleLayout', () => {
    it('should toggle hierarchical layout', () => {
      const { result } = renderHook(() =>
        useReasoningChainState([mockChain])
      );

      expect(result.current.state.useHierarchicalLayout).toBe(true);

      act(() => {
        result.current.toggleLayout();
      });

      expect(result.current.state.useHierarchicalLayout).toBe(false);
    });
  });

  describe('hover handling', () => {
    it('should handle node hover for reasoning nodes', () => {
      const { result } = renderHook(() =>
        useReasoningChainState([mockChain])
      );

      const position = { x: 100, y: 200 };

      act(() => {
        result.current.handleNodeHover(mockNode, position);
      });

      expect(result.current.state.hoveredNode).toEqual(mockNode);
      expect(result.current.state.hoverPosition).toEqual(position);
      expect(result.current.state.showTooltip).toBe(true);
    });

    it('should ignore hover for non-reasoning nodes', () => {
      const { result } = renderHook(() =>
        useReasoningChainState([mockChain])
      );

      const nonReasoningNode: GraphNode = {
        ...mockNode,
        type: 'claim',
      };

      act(() => {
        result.current.handleNodeHover(nonReasoningNode, { x: 100, y: 200 });
      });

      expect(result.current.state.hoveredNode).toBeNull();
      expect(result.current.state.showTooltip).toBe(false);
    });

    it('should clear hover state on hover end', () => {
      const { result } = renderHook(() =>
        useReasoningChainState([mockChain])
      );

      act(() => {
        result.current.handleNodeHover(mockNode, { x: 100, y: 200 });
      });

      act(() => {
        result.current.handleNodeHoverEnd();
      });

      expect(result.current.state.hoveredNode).toBeNull();
      expect(result.current.state.hoverPosition).toBeNull();
      expect(result.current.state.showTooltip).toBe(false);
    });
  });

  describe('transformed data', () => {
    it('should transform chains to graph data', () => {
      const { result } = renderHook(() =>
        useReasoningChainState([mockChain], { claimId: 'claim-1' })
      );

      expect(result.current.transformedData).toHaveLength(1);
      expect(result.current.transformedData[0].chainId).toBe('chain-1');
    });

    it('should flatten reasoning nodes', () => {
      const { result } = renderHook(() =>
        useReasoningChainState([mockChain])
      );

      expect(result.current.reasoningNodes.length).toBeGreaterThan(0);
    });

    it('should flatten reasoning links', () => {
      const { result } = renderHook(() =>
        useReasoningChainState([mockChain], { claimId: 'claim-1' })
      );

      expect(result.current.reasoningLinks.length).toBeGreaterThan(0);
    });

    it('should update when layout type changes', () => {
      const { result, rerender } = renderHook(() =>
        useReasoningChainState([mockChain])
      );

      const initialLayout = result.current.transformedData[0].layout;

      act(() => {
        result.current.toggleLayout();
      });

      rerender();

      expect(result.current.transformedData[0].layout).not.toBe(initialLayout);
    });
  });
});
