/**
 * Knowledge Graph Visualization Constants
 */

export const NODE_COLORS = {
  claim: '#3B82F6',      // Blue
  evidence: '#10B981',   // Green
  reasoning: '#8B5CF6',  // Purple
  hypothesis: '#F59E0B', // Amber
  assertion: '#3B82F6',  // Blue
  question: '#EC4899',   // Pink
} as const;

export const NODE_SIZES = {
  small: 8,
  medium: 12,
  large: 16,
  xlarge: 20,
} as const;

export const LINK_TYPES = {
  SUPPORTS: 'supports',
  CONTRADICTS: 'contradicts',
  NEUTRAL: 'neutral',
  RELATED: 'related',
} as const;

export const LINK_COLORS = {
  supports: '#10B981',     // Green
  contradicts: '#EF4444',  // Red
  neutral: '#6B7280',      // Gray
  related: '#3B82F6',      // Blue
} as const;

export const GRAPH_CONFIG = {
  forceStrength: -300,
  linkDistance: 100,
  centerForce: 0.05,
  collisionRadius: 30,
  alpha: 0.3,
  alphaDecay: 0.02,
  velocityDecay: 0.4,
} as const;

export const ZOOM_CONFIG = {
  min: 0.1,
  max: 8,
  default: 1,
  step: 0.2,
} as const;

export const GRAPH_LIMITS = {
  maxNodes: 1000,
  maxLinks: 5000,
  virtualizationThreshold: 500,
} as const;

/**
 * Reasoning Step Type Colors
 *
 * Color palette for reasoning chain visualization:
 * - Premises (blue): Foundation of the argument
 * - Inferences (purple): Logical deductions
 * - Conclusions (green): Final assertions
 */
export const REASONING_STEP_COLORS = {
  premise: '#3B82F6',      // Blue - foundation
  inference: '#A855F7',    // Purple - middle processing
  conclusion: '#22C55E',   // Green - result
  assumption: '#F59E0B',   // Amber - unverified
  observation: '#06B6D4',  // Cyan - empirical data
} as const;

/**
 * Reasoning Step Background Colors (lighter versions for fills)
 */
export const REASONING_STEP_BG_COLORS = {
  premise: '#EFF6FF',      // Light blue
  inference: '#F3E8FF',    // Light purple
  conclusion: '#DCFCE7',   // Light green
  assumption: '#FEF3C7',   // Light amber
  observation: '#CFFAFE',  // Light cyan
} as const;

/**
 * Reasoning Step Border Colors
 */
export const REASONING_STEP_BORDER_COLORS = {
  premise: '#93C5FD',      // Blue-300
  inference: '#C4B5FD',    // Purple-300
  conclusion: '#86EFAC',   // Green-300
  assumption: '#FCD34D',   // Amber-300
  observation: '#67E8F9',  // Cyan-300
} as const;

/**
 * Reasoning Link Colors
 */
export const REASONING_LINK_COLORS = {
  supports: '#22C55E',     // Green
  requires: '#8B5CF6',     // Purple
  contradicts: '#EF4444',  // Red
  concludes: '#3B82F6',    // Blue
  evidenceToPrefix: '#10B981', // Emerald
} as const;

/**
 * Reasoning Flow Gradient Stops
 * Used for animated path visualization
 */
export const REASONING_FLOW_GRADIENT = {
  start: '#3B82F6',   // Blue (premise)
  middle: '#A855F7',  // Purple (inference)
  end: '#22C55E',     // Green (conclusion)
} as const;

/**
 * Reasoning Layout Configuration
 */
export const REASONING_LAYOUT_CONFIG = {
  levelSpacing: 150,       // Vertical space between levels
  nodeSpacing: 100,        // Horizontal space between nodes
  marginX: 50,             // Horizontal margin
  marginY: 50,             // Vertical margin
  animationDuration: 500,  // Transition duration in ms
} as const;

/**
 * Reasoning Node Shapes
 * Different shapes for different step types
 */
export const REASONING_NODE_SHAPES = {
  premise: 'circle',
  inference: 'diamond',
  conclusion: 'hexagon',
  assumption: 'square',
  observation: 'triangle',
} as const;
