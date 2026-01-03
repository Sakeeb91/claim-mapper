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

  // Create dependency links from structure.dependencies (if available)
  // The backend model has: { from: number, to: number, relationship: string }
  createDependencyLinks(chain, links);

  return {
    nodes,
    links,
    chainId: chain.id,
    chainType: chain.type,
    layout: opts.layout,
    stepCount: chain.steps.length,
  };
}

/**
 * Creates links between reasoning steps based on the dependency structure.
 * Dependencies define the logical flow: which steps lead to which other steps.
 *
 * @param chain - The reasoning chain with dependency data
 * @param links - Array to add links to (mutated)
 */
function createDependencyLinks(chain: ReasoningChain, links: GraphLink[]): void {
  // Access extended chain data that may include structure.dependencies
  const chainData = chain as ReasoningChain & {
    structure?: {
      dependencies?: Array<{
        from: number;
        to: number;
        relationship: 'supports' | 'requires' | 'contradicts';
      }>;
    };
  };

  const dependencies = chainData.structure?.dependencies;
  if (!dependencies || dependencies.length === 0) {
    // If no explicit dependencies, create sequential links based on step order
    createSequentialLinks(chain, links);
    return;
  }

  // Create links from explicit dependencies
  dependencies.forEach((dep) => {
    const sourceId = `step-${chain.id}-${dep.from}`;
    const targetId = `step-${chain.id}-${dep.to}`;
    const linkId = `dep-${chain.id}-${dep.from}-${dep.to}`;

    const linkType = dep.relationship === 'contradicts' ? 'contradicts' : 'reasoning';

    links.push({
      id: linkId,
      source: sourceId,
      target: targetId,
      type: linkType,
      strength: 1,
      label: dep.relationship,
      curved: false,
      data: {
        relationship: dep.relationship,
        isLogicalFlow: true,
        chainId: chain.id,
      },
    });
  });
}

/**
 * Creates sequential links between steps when no explicit dependencies exist.
 * Links are created based on step order: step 1 → step 2 → step 3, etc.
 *
 * @param chain - The reasoning chain
 * @param links - Array to add links to (mutated)
 */
function createSequentialLinks(chain: ReasoningChain, links: GraphLink[]): void {
  const sortedSteps = [...chain.steps].sort((a, b) => a.order - b.order);

  for (let i = 0; i < sortedSteps.length - 1; i++) {
    const currentStep = sortedSteps[i];
    const nextStep = sortedSteps[i + 1];

    const sourceId = `step-${chain.id}-${currentStep.order}`;
    const targetId = `step-${chain.id}-${nextStep.order}`;
    const linkId = `seq-${chain.id}-${currentStep.order}-${nextStep.order}`;

    links.push({
      id: linkId,
      source: sourceId,
      target: targetId,
      type: 'reasoning',
      strength: 1,
      label: 'leads to',
      curved: false,
      data: {
        relationship: 'requires',
        isLogicalFlow: true,
        chainId: chain.id,
      },
    });
  }
}
