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
