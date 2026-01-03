/**
 * Hierarchical Layout for Reasoning Chains
 *
 * Positions reasoning nodes in a top-to-bottom hierarchical arrangement:
 * - Level 0 (top): Premises, assumptions, observations
 * - Level 1 (middle): Inferences
 * - Level 2 (bottom): Conclusions
 *
 * Non-reasoning nodes remain in force-directed layout.
 */

import type { GraphNode, GraphLink } from '@/types';

/**
 * Configuration for hierarchical layout
 */
export interface HierarchicalLayoutConfig {
  /** Width of the layout area */
  width: number;
  /** Height of the layout area */
  height: number;
  /** Horizontal margin from edges */
  marginX?: number;
  /** Vertical margin from edges */
  marginY?: number;
  /** Minimum spacing between nodes at same level */
  minNodeSpacing?: number;
  /** Whether to fix positions (prevent force simulation movement) */
  fixPositions?: boolean;
}

const DEFAULT_CONFIG: Required<HierarchicalLayoutConfig> = {
  width: 800,
  height: 600,
  marginX: 50,
  marginY: 50,
  minNodeSpacing: 100,
  fixPositions: true,
};

/**
 * Groups nodes by their hierarchical level
 */
interface LevelGroups {
  level0: GraphNode[]; // Premises, assumptions, observations
  level1: GraphNode[]; // Inferences
  level2: GraphNode[]; // Conclusions
  other: GraphNode[];  // Non-reasoning nodes
}

/**
 * Groups reasoning nodes by their level for hierarchical positioning.
 *
 * @param nodes - Array of graph nodes
 * @returns Grouped nodes by level
 */
function groupNodesByLevel(nodes: GraphNode[]): LevelGroups {
  const groups: LevelGroups = {
    level0: [],
    level1: [],
    level2: [],
    other: [],
  };

  nodes.forEach((node) => {
    if (node.type !== 'reasoning' || node.level === undefined) {
      groups.other.push(node);
      return;
    }

    switch (node.level) {
      case 0:
        groups.level0.push(node);
        break;
      case 1:
        groups.level1.push(node);
        break;
      case 2:
        groups.level2.push(node);
        break;
      default:
        groups.other.push(node);
    }
  });

  return groups;
}

/**
 * Calculates evenly distributed X positions for nodes at a given level.
 *
 * @param nodes - Nodes to position
 * @param width - Available width
 * @param marginX - Horizontal margin
 * @param minSpacing - Minimum spacing between nodes
 * @returns X positions for each node
 */
function calculateHorizontalPositions(
  nodes: GraphNode[],
  width: number,
  marginX: number,
  minSpacing: number
): number[] {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) return [width / 2];

  const availableWidth = width - 2 * marginX;
  const idealSpacing = availableWidth / (nodes.length + 1);
  const spacing = Math.max(idealSpacing, minSpacing);

  // Calculate total width needed
  const totalWidth = spacing * (nodes.length + 1);

  // Center the nodes if they don't fill the width
  const startX = totalWidth <= availableWidth
    ? marginX + (availableWidth - totalWidth) / 2 + spacing
    : marginX + spacing;

  return nodes.map((_, index) => startX + index * spacing);
}

/**
 * Applies hierarchical layout to reasoning nodes.
 *
 * Premises are positioned at the top, inferences in the middle,
 * and conclusions at the bottom. This creates a clear visual flow
 * from top to bottom showing the logical progression.
 *
 * @param nodes - Array of graph nodes to position
 * @param links - Array of graph links (used for dependency-aware positioning)
 * @param config - Layout configuration
 * @returns Modified nodes array with positions set
 */
export function applyHierarchicalLayout(
  nodes: GraphNode[],
  links: GraphLink[],
  config: HierarchicalLayoutConfig
): GraphNode[] {
  const opts = { ...DEFAULT_CONFIG, ...config };
  const { width, height, marginX, marginY, minNodeSpacing, fixPositions } = opts;

  // Group nodes by level
  const groups = groupNodesByLevel(nodes);

  // Calculate Y positions for each level
  const usableHeight = height - 2 * marginY;
  const levelCount = 3; // premises, inferences, conclusions
  const levelHeight = usableHeight / (levelCount + 1);

  const levelYPositions = {
    level0: marginY + levelHeight,      // Top (premises)
    level1: marginY + levelHeight * 2,  // Middle (inferences)
    level2: marginY + levelHeight * 3,  // Bottom (conclusions)
  };

  // Position level 0 (premises)
  const level0XPositions = calculateHorizontalPositions(
    groups.level0,
    width,
    marginX,
    minNodeSpacing
  );
  groups.level0.forEach((node, index) => {
    node.x = level0XPositions[index];
    node.y = levelYPositions.level0;
    if (fixPositions) {
      node.fx = node.x;
      node.fy = node.y;
    }
  });

  // Position level 1 (inferences)
  const level1XPositions = calculateHorizontalPositions(
    groups.level1,
    width,
    marginX,
    minNodeSpacing
  );
  groups.level1.forEach((node, index) => {
    node.x = level1XPositions[index];
    node.y = levelYPositions.level1;
    if (fixPositions) {
      node.fx = node.x;
      node.fy = node.y;
    }
  });

  // Position level 2 (conclusions)
  const level2XPositions = calculateHorizontalPositions(
    groups.level2,
    width,
    marginX,
    minNodeSpacing
  );
  groups.level2.forEach((node, index) => {
    node.x = level2XPositions[index];
    node.y = levelYPositions.level2;
    if (fixPositions) {
      node.fx = node.x;
      node.fy = node.y;
    }
  });

  // Leave 'other' nodes for force-directed layout
  // (their positions will be determined by the simulation)

  return nodes;
}

/**
 * Releases fixed positions on reasoning nodes.
 * Call this to allow force simulation to move reasoning nodes again.
 *
 * @param nodes - Array of graph nodes
 * @returns Modified nodes array with fixed positions cleared
 */
export function releaseHierarchicalPositions(nodes: GraphNode[]): GraphNode[] {
  nodes.forEach((node) => {
    if (node.type === 'reasoning') {
      node.fx = null;
      node.fy = null;
    }
  });
  return nodes;
}

/**
 * Checks if a node is a reasoning node that should be hierarchically laid out.
 *
 * @param node - Graph node to check
 * @returns True if node should be in hierarchical layout
 */
export function isReasoningLayoutNode(node: GraphNode): boolean {
  return node.type === 'reasoning' && node.level !== undefined;
}

/**
 * Separates nodes into those that should use hierarchical layout
 * and those that should use force-directed layout.
 *
 * @param nodes - All graph nodes
 * @returns Object with hierarchical and force-directed node arrays
 */
export function partitionNodesByLayoutType(nodes: GraphNode[]): {
  hierarchical: GraphNode[];
  forceDirected: GraphNode[];
} {
  const hierarchical: GraphNode[] = [];
  const forceDirected: GraphNode[] = [];

  nodes.forEach((node) => {
    if (isReasoningLayoutNode(node)) {
      hierarchical.push(node);
    } else {
      forceDirected.push(node);
    }
  });

  return { hierarchical, forceDirected };
}

/**
 * Applies hybrid layout: hierarchical for reasoning nodes,
 * force-directed for everything else.
 *
 * This is the main entry point for layout integration with D3.
 * It positions reasoning nodes hierarchically and leaves other
 * nodes to be positioned by the force simulation.
 *
 * @param nodes - All graph nodes
 * @param links - All graph links
 * @param config - Layout configuration
 * @param useHierarchical - Whether to use hierarchical layout for reasoning
 * @returns Modified nodes array
 */
export function applyHybridLayout(
  nodes: GraphNode[],
  links: GraphLink[],
  config: HierarchicalLayoutConfig,
  useHierarchical: boolean = true
): GraphNode[] {
  if (!useHierarchical) {
    // Release any fixed positions
    return releaseHierarchicalPositions(nodes);
  }

  // Apply hierarchical layout to reasoning nodes
  return applyHierarchicalLayout(nodes, links, config);
}
