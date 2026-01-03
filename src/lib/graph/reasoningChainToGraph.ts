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
 * Linked evidence data structure (from backend)
 */
export interface EvidenceInfo {
  id: string;
  text: string;
  relationship?: 'supports' | 'refutes' | 'partial_support' | 'partial_refute' | 'neutral';
  confidence?: number;
}

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
  /** Map of evidence IDs to evidence info (for creating evidence links) */
  evidenceMap?: Map<string, EvidenceInfo>;
}

const DEFAULT_OPTIONS: Omit<Required<ReasoningChainTransformOptions>, 'evidenceMap'> & { evidenceMap?: Map<string, EvidenceInfo> } = {
  maxLabelLength: 50,
  includeEvidenceLinks: true,
  includeConclusionToClaimLink: true,
  layout: 'hierarchical',
  evidenceMap: undefined,
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

  // Create evidence-to-premise links if enabled and evidence map provided
  if (opts.includeEvidenceLinks) {
    createEvidenceToPremiseLinks(chain, links, opts.evidenceMap);
  }

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

/**
 * Creates links from evidence nodes to premise steps.
 * Uses linkedEvidence from step metadata (populated by semantic linking pipeline)
 * or falls back to evidence map if provided.
 *
 * @param chain - The reasoning chain
 * @param links - Array to add links to (mutated)
 * @param evidenceMap - Optional map of evidence IDs to evidence info
 */
function createEvidenceToPremiseLinks(
  chain: ReasoningChain,
  links: GraphLink[],
  evidenceMap?: Map<string, EvidenceInfo>
): void {
  // Access extended step data that may include linkedEvidence
  const chainData = chain as ReasoningChain & {
    steps: Array<ReasoningStep & {
      metadata?: {
        linkedEvidence?: Array<{
          evidenceId: string;
          relationship: string;
          confidence?: number;
        }>;
      };
    }>;
  };

  chainData.steps.forEach((step) => {
    // Only link evidence to premises (and assumptions/observations)
    if (step.type !== 'premise' && step.type !== 'assumption' && step.type !== 'observation') {
      return;
    }

    const linkedEvidence = step.metadata?.linkedEvidence || [];
    const stepNodeId = `step-${chain.id}-${step.order}`;

    linkedEvidence.forEach((evidence) => {
      const linkId = `ev-${evidence.evidenceId}-${chain.id}-${step.order}`;

      // Determine link type based on relationship
      let linkType: GraphLink['type'] = 'supports';
      if (evidence.relationship === 'refutes' || evidence.relationship === 'partial_refute') {
        linkType = 'contradicts';
      }

      links.push({
        id: linkId,
        source: evidence.evidenceId,
        target: stepNodeId,
        type: linkType,
        strength: evidence.confidence || 0.7,
        label: evidence.relationship,
        curved: true, // Curve evidence links to distinguish from reasoning flow
        data: {
          relationship: 'evidence-to-premise',
          isLogicalFlow: false,
          chainId: chain.id,
        },
      });
    });

    // Fallback: use evidenceMap if no linkedEvidence in metadata
    if (linkedEvidence.length === 0 && evidenceMap) {
      evidenceMap.forEach((evidence, evidenceId) => {
        // Simple heuristic: link all evidence to all premises
        // In production, this would use semantic similarity
        const linkId = `ev-map-${evidenceId}-${chain.id}-${step.order}`;

        const linkType = evidence.relationship === 'refutes' ||
          evidence.relationship === 'partial_refute' ? 'contradicts' : 'supports';

        links.push({
          id: linkId,
          source: evidenceId,
          target: stepNodeId,
          type: linkType,
          strength: evidence.confidence || 0.5,
          label: evidence.relationship || 'supports',
          curved: true,
          data: {
            relationship: 'evidence-to-premise',
            isLogicalFlow: false,
            chainId: chain.id,
          },
        });
      });
    }
  });
}
