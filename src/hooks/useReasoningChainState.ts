/**
 * useReasoningChainState Hook
 *
 * Manages state for reasoning chain visualization in the knowledge graph.
 * Handles chain highlighting, overlay visibility, layout mode, and tooltips.
 */

import { useState, useCallback, useMemo } from 'react';
import { GraphNode, ReasoningChain, ReasoningGraphData } from '@/types';
import { reasoningChainToGraph } from '@/lib/graph/reasoningChainToGraph';

export interface ReasoningChainState {
  /** ID of currently highlighted chain (null = none highlighted) */
  highlightedChainId: string | null;
  /** Whether reasoning overlay is visible */
  showOverlay: boolean;
  /** Whether to use hierarchical layout for reasoning nodes */
  useHierarchicalLayout: boolean;
  /** Currently hovered node (for tooltip) */
  hoveredNode: GraphNode | null;
  /** Position of hovered node (for tooltip positioning) */
  hoverPosition: { x: number; y: number } | null;
  /** Whether tooltip is visible */
  showTooltip: boolean;
}

export interface UseReasoningChainStateReturn {
  /** Current state */
  state: ReasoningChainState;
  /** Set highlighted chain */
  setHighlightedChain: (chainId: string | null) => void;
  /** Toggle overlay visibility */
  toggleOverlay: () => void;
  /** Toggle hierarchical layout */
  toggleLayout: () => void;
  /** Handle node hover start */
  handleNodeHover: (node: GraphNode, position: { x: number; y: number }) => void;
  /** Handle node hover end */
  handleNodeHoverEnd: () => void;
  /** Transform chains to graph data */
  transformedData: ReasoningGraphData[];
  /** All reasoning links from transformed data */
  reasoningLinks: ReasoningGraphData['links'];
  /** All reasoning nodes from transformed data */
  reasoningNodes: ReasoningGraphData['nodes'];
}

export interface UseReasoningChainStateOptions {
  /** Initial overlay visibility */
  initialShowOverlay?: boolean;
  /** Initial layout mode */
  initialUseHierarchicalLayout?: boolean;
  /** Claim ID to link conclusions to */
  claimId?: string;
}

/**
 * Hook for managing reasoning chain visualization state.
 *
 * @param chains - Array of reasoning chains to visualize
 * @param options - Configuration options
 * @returns State and handlers for reasoning chain visualization
 */
export function useReasoningChainState(
  chains: ReasoningChain[],
  options: UseReasoningChainStateOptions = {}
): UseReasoningChainStateReturn {
  const {
    initialShowOverlay = true,
    initialUseHierarchicalLayout = true,
    claimId = '',
  } = options;

  // Core state
  const [highlightedChainId, setHighlightedChainId] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(initialShowOverlay);
  const [useHierarchicalLayout, setUseHierarchicalLayout] = useState(initialUseHierarchicalLayout);

  // Hover state
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  // Transform chains to graph data
  const transformedData = useMemo(() => {
    return chains.map((chain) =>
      reasoningChainToGraph(chain, claimId, {
        layout: useHierarchicalLayout ? 'hierarchical' : 'force',
        includeEvidenceLinks: true,
        includeConclusionToClaimLink: !!claimId,
      })
    );
  }, [chains, claimId, useHierarchicalLayout]);

  // Flatten all reasoning links
  const reasoningLinks = useMemo(() => {
    return transformedData.flatMap((data) => data.links);
  }, [transformedData]);

  // Flatten all reasoning nodes
  const reasoningNodes = useMemo(() => {
    return transformedData.flatMap((data) => data.nodes);
  }, [transformedData]);

  // Handlers
  const setHighlightedChain = useCallback((chainId: string | null) => {
    setHighlightedChainId(chainId);
  }, []);

  const toggleOverlay = useCallback(() => {
    setShowOverlay((prev) => !prev);
  }, []);

  const toggleLayout = useCallback(() => {
    setUseHierarchicalLayout((prev) => !prev);
  }, []);

  const handleNodeHover = useCallback((node: GraphNode, position: { x: number; y: number }) => {
    if (node.type === 'reasoning') {
      setHoveredNode(node);
      setHoverPosition(position);
      setShowTooltip(true);
    }
  }, []);

  const handleNodeHoverEnd = useCallback(() => {
    setHoveredNode(null);
    setHoverPosition(null);
    setShowTooltip(false);
  }, []);

  // Combined state
  const state: ReasoningChainState = {
    highlightedChainId,
    showOverlay,
    useHierarchicalLayout,
    hoveredNode,
    hoverPosition,
    showTooltip,
  };

  return {
    state,
    setHighlightedChain,
    toggleOverlay,
    toggleLayout,
    handleNodeHover,
    handleNodeHoverEnd,
    transformedData,
    reasoningLinks,
    reasoningNodes,
  };
}

export default useReasoningChainState;
