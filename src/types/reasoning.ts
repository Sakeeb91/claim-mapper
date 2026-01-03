/**
 * Reasoning Chain Visualization Types
 *
 * Type definitions specifically for reasoning chain flow visualization.
 * These extend the base graph types with reasoning-specific properties.
 */

import type { GraphNode, GraphLink, ReasoningChain } from './index';

/**
 * Step types that can appear in a reasoning chain
 */
export type ReasoningStepType = 'premise' | 'inference' | 'conclusion' | 'assumption' | 'observation';

/**
 * Relationship types for reasoning chain links
 */
export type ReasoningRelationship =
  | 'supports'
  | 'requires'
  | 'contradicts'
  | 'evidence-to-premise'
  | 'concludes';

/**
 * Layout types for reasoning chain visualization
 */
export type ReasoningLayout = 'hierarchical' | 'force';

/**
 * Extended graph node with reasoning-specific properties
 */
export interface ReasoningGraphNode extends GraphNode {
  type: 'reasoning';
  subtype: ReasoningStepType;
  level: number;
  stepNumber: number;
  chainId: string;
}

/**
 * Extended graph link with reasoning-specific data
 */
export interface ReasoningGraphLink extends GraphLink {
  data: {
    relationship: ReasoningRelationship;
    isLogicalFlow: boolean;
    chainId: string;
  };
}

/**
 * Reasoning chain graph data structure
 */
export interface ReasoningChainGraphData {
  nodes: ReasoningGraphNode[];
  links: ReasoningGraphLink[];
  chainId: string;
  chainType: ReasoningChain['type'];
  layout: ReasoningLayout;
  stepCount: number;
}

/**
 * Configuration for reasoning path overlay
 */
export interface ReasoningPathConfig {
  /** Whether to animate paths */
  animate: boolean;
  /** Animation duration in ms */
  animationDuration: number;
  /** Whether to show path gradients */
  showGradients: boolean;
  /** Whether to show arrow markers */
  showArrows: boolean;
  /** Path stroke width */
  strokeWidth: number;
  /** Highlighted chain opacity */
  highlightOpacity: number;
  /** Dimmed chain opacity */
  dimmedOpacity: number;
}

/**
 * Configuration for hierarchical layout
 */
export interface HierarchicalLayoutOptions {
  /** Available width for layout */
  width: number;
  /** Available height for layout */
  height: number;
  /** Horizontal margin */
  marginX: number;
  /** Vertical margin */
  marginY: number;
  /** Minimum horizontal spacing between nodes */
  minNodeSpacing: number;
  /** Whether to fix node positions (prevent simulation movement) */
  fixPositions: boolean;
}

/**
 * State for reasoning chain visualization
 */
export interface ReasoningVisualizationState {
  /** Currently highlighted chain ID */
  highlightedChainId: string | null;
  /** Whether overlay is visible */
  showOverlay: boolean;
  /** Whether using hierarchical layout */
  useHierarchicalLayout: boolean;
  /** Currently hovered node */
  hoveredNode: ReasoningGraphNode | null;
  /** Hover position for tooltip */
  hoverPosition: { x: number; y: number } | null;
  /** Whether tooltip is visible */
  showTooltip: boolean;
}

/**
 * Color configuration for a step type
 */
export interface StepTypeColors {
  /** Primary color (icons, borders) */
  primary: string;
  /** Background color */
  background: string;
  /** Border color */
  border: string;
}

/**
 * All step type color configurations
 */
export type StepTypeColorMap = Record<ReasoningStepType, StepTypeColors>;
