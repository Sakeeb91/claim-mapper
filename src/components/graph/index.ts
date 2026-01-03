/**
 * Graph Components Barrel Export
 */

// Core graph components
export { KnowledgeGraph } from './KnowledgeGraph';
export type { KnowledgeGraphHandle } from './KnowledgeGraph';
export { GraphVisualization } from './GraphVisualization';
export { GraphControls } from './GraphControls';
export { NodeDetailsPanel } from './NodeDetailsPanel';
export { CoverageHeatmap } from './CoverageHeatmap';
export { EvidenceDrawer } from './EvidenceDrawer';
export { ExportButton } from './ExportButton';

// Reasoning chain visualization components
export {
  ReasoningPathOverlay,
  updateReasoningPaths,
  getReasoningPathGroup,
} from './ReasoningPathOverlay';
export type { ReasoningPathOverlayProps } from './ReasoningPathOverlay';

export {
  getShapePath,
  getNodeColors,
  renderReasoningNodes,
  updateReasoningNodePositions,
  renderStepNumberBadges,
  renderConfidenceIndicators,
} from './ReasoningNodeRenderer';

export { ReasoningChainFilter } from './ReasoningChainFilter';
export type { ReasoningChainFilterProps } from './ReasoningChainFilter';

export { ReasoningStepTooltip } from './ReasoningStepTooltip';
export type { ReasoningStepTooltipProps } from './ReasoningStepTooltip';

export { ReasoningLegend } from './ReasoningLegend';
export type { ReasoningLegendProps } from './ReasoningLegend';
