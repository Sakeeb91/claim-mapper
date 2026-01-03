/**
 * Reasoning Chain to Graph Transformer
 *
 * Transforms ReasoningChain data into graph nodes and links for visualization.
 * Supports hierarchical layout hints for premise → inference → conclusion flow.
 */

import type {
  GraphNode,
  GraphLink,
  ReasoningChain,
  ReasoningStep,
  ReasoningGraphData,
  ReasoningNodeSubtype,
  ReasoningLayoutType,
} from '@/types';

/**
 * Configuration options for the transformation
 */
export interface ReasoningChainTransformOptions {
  /** Maximum label length before truncation */
  maxLabelLength?: number;
  /** Include evidence links to premise nodes */
  includeEvidenceLinks?: boolean;
  /** Include link from conclusion to claim */
  includeConclusionToClaimLink?: boolean;
  /** Preferred layout type */
  layout?: ReasoningLayoutType;
}

const DEFAULT_OPTIONS: Required<ReasoningChainTransformOptions> = {
  maxLabelLength: 50,
  includeEvidenceLinks: true,
  includeConclusionToClaimLink: true,
  layout: 'hierarchical',
};

/**
 * Maps step type to hierarchical level
 * Level 0: premises (top)
 * Level 1: inferences (middle)
 * Level 2: conclusions (bottom)
 */
function getStepLevel(stepType: ReasoningNodeSubtype): number {
  switch (stepType) {
    case 'premise':
    case 'assumption':
    case 'observation':
      return 0;
    case 'inference':
      return 1;
    case 'conclusion':
      return 2;
    default:
      return 1;
  }
}

/**
 * Truncates text to specified length with ellipsis
 */
function truncateLabel(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Transforms a ReasoningChain into graph visualization data
 *
 * @param chain - The reasoning chain to transform
 * @param claimId - ID of the claim this chain belongs to
 * @param options - Transformation options
 * @returns Graph data with nodes, links, and metadata
 */
export function reasoningChainToGraph(
  chain: ReasoningChain,
  claimId: string,
  options: ReasoningChainTransformOptions = {}
): ReasoningGraphData {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  // Create nodes for each reasoning step
  chain.steps.forEach((step) => {
    const stepType = step.type as ReasoningNodeSubtype;
    const nodeId = `step-${chain.id}-${step.order}`;

    nodes.push({
      id: nodeId,
      type: 'reasoning',
      label: truncateLabel(step.text, opts.maxLabelLength),
      size: 15,
      color: '', // Will be set by visualization based on subtype
      confidence: step.confidence,
      data: chain,
      // Reasoning-specific properties
      subtype: stepType,
      level: getStepLevel(stepType),
      stepNumber: step.order,
      chainId: chain.id,
    });
  });

  return {
    nodes,
    links,
    chainId: chain.id,
    chainType: chain.type,
    layout: opts.layout,
    stepCount: chain.steps.length,
  };
}
