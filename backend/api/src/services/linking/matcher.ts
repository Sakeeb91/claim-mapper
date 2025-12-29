/**
 * Premise-Evidence Matcher Service
 *
 * Orchestrates the semantic linking pipeline:
 * 1. Vector search for initial candidates
 * 2. Cross-encoder reranking for precision
 * 3. Relationship classification for each match
 *
 * @module services/linking/matcher
 */

import { searchByProject, SimilarityResult } from '../vectorStore';
import { rerank, RerankResult } from './reranker';
import { classifyRelationship, Relationship, ClassificationResult } from './classifier';
import { logger } from '../../utils/logger';

/**
 * Evidence linked to a premise with relationship metadata
 */
export interface LinkedEvidence {
  evidenceId: string;
  evidenceText: string;
  relationship: Relationship;
  confidence: number;
  vectorScore: number;
  rerankScore: number;
  sourceUrl?: string;
  sourceTitle?: string;
  reasoning?: string;
}

/**
 * Options for premise-evidence linking
 */
export interface LinkingOptions {
  /** Number of candidates from vector search (default: 20) */
  topK?: number;
  /** Number of results after reranking (default: 5) */
  rerankK?: number;
  /** Minimum confidence threshold (default: 0.3) */
  minScore?: number;
  /** Skip reranking step (default: false) */
  skipReranking?: boolean;
  /** Skip classification step (default: false) */
  skipClassification?: boolean;
  /** Filter by evidence type */
  evidenceType?: string;
}

/**
 * Result from the linking pipeline
 */
export interface LinkingResult {
  premise: string;
  projectId: string;
  linkedEvidence: LinkedEvidence[];
  stats: {
    candidatesFound: number;
    afterReranking: number;
    afterFiltering: number;
    processingTimeMs: number;
  };
}

/**
 * Default linking options
 */
const DEFAULT_OPTIONS: Required<Omit<LinkingOptions, 'evidenceType'>> = {
  topK: 20,
  rerankK: 5,
  minScore: 0.3,
  skipReranking: false,
  skipClassification: false,
};

/**
 * Link a premise to relevant evidence in a project
 *
 * This function implements a three-stage pipeline:
 * 1. Vector similarity search to find candidate evidence
 * 2. Cross-encoder reranking to improve precision
 * 3. Relationship classification to determine support/refute
 *
 * @param premise - The premise statement to find evidence for
 * @param projectId - The project ID to search within
 * @param options - Linking configuration options
 * @returns Linked evidence with relationship metadata
 */
export async function linkPremiseToEvidence(
  premise: string,
  projectId: string,
  options: LinkingOptions = {}
): Promise<LinkingResult> {
  const startTime = Date.now();
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const result: LinkingResult = {
    premise,
    projectId,
    linkedEvidence: [],
    stats: {
      candidatesFound: 0,
      afterReranking: 0,
      afterFiltering: 0,
      processingTimeMs: 0,
    },
  };

  if (!premise || premise.trim().length === 0) {
    logger.warn('Empty premise provided to linkPremiseToEvidence');
    result.stats.processingTimeMs = Date.now() - startTime;
    return result;
  }

  try {
    // Stage 1: Vector similarity search
    const searchOptions: { topK: number; filter?: Record<string, string> } = {
      topK: opts.topK,
    };

    if (opts.evidenceType) {
      searchOptions.filter = { evidenceType: opts.evidenceType };
    }

    const candidates = await searchByProject(premise, projectId, searchOptions);
    result.stats.candidatesFound = candidates.length;

    if (candidates.length === 0) {
      logger.debug('No candidates found for premise', { projectId, premiseLength: premise.length });
      result.stats.processingTimeMs = Date.now() - startTime;
      return result;
    }

    // Stage 2: Cross-encoder reranking (optional)
    let rerankedCandidates: Array<{
      candidate: SimilarityResult;
      rerankScore: number;
    }>;

    if (opts.skipReranking || candidates.length <= opts.rerankK) {
      // Skip reranking, use vector scores directly
      rerankedCandidates = candidates.map((c) => ({
        candidate: c,
        rerankScore: c.score,
      }));
    } else {
      const candidateTexts = candidates.map((c) => c.metadata.text);
      const reranked = await rerank(premise, candidateTexts, opts.rerankK);

      rerankedCandidates = reranked.map((r) => ({
        candidate: candidates[r.originalIndex],
        rerankScore: r.score,
      }));
    }

    result.stats.afterReranking = rerankedCandidates.length;

    // Stage 3: Relationship classification
    const linkedEvidence: LinkedEvidence[] = [];

    for (const { candidate, rerankScore } of rerankedCandidates) {
      // Skip if below minimum score threshold
      const effectiveScore = rerankScore;
      if (effectiveScore < opts.minScore) {
        continue;
      }

      // Classify relationship (optional)
      let classification: ClassificationResult;
      if (opts.skipClassification) {
        classification = {
          relationship: 'supports',
          confidence: effectiveScore,
        };
      } else {
        classification = await classifyRelationship(premise, candidate.metadata.text);
      }

      linkedEvidence.push({
        evidenceId: candidate.id,
        evidenceText: candidate.metadata.text,
        relationship: classification.relationship,
        confidence: classification.confidence,
        vectorScore: candidate.score,
        rerankScore,
        sourceUrl: candidate.metadata.sourceUrl || undefined,
        sourceTitle: candidate.metadata.sourceTitle || undefined,
        reasoning: classification.reasoning,
      });
    }

    result.linkedEvidence = linkedEvidence;
    result.stats.afterFiltering = linkedEvidence.length;
    result.stats.processingTimeMs = Date.now() - startTime;

    logger.info('Premise-evidence linking completed', {
      projectId,
      premiseLength: premise.length,
      candidatesFound: result.stats.candidatesFound,
      afterReranking: result.stats.afterReranking,
      linkedCount: result.stats.afterFiltering,
      processingTimeMs: result.stats.processingTimeMs,
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Premise-evidence linking failed', {
      error: errorMessage,
      projectId,
      premiseLength: premise.length,
    });

    result.stats.processingTimeMs = Date.now() - startTime;
    return result;
  }
}

/**
 * Link multiple premises to evidence in batch
 *
 * @param premises - Array of premise statements
 * @param projectId - The project ID to search within
 * @param options - Linking configuration options
 * @returns Array of linking results for each premise
 */
export async function linkPremisesBatch(
  premises: string[],
  projectId: string,
  options: LinkingOptions = {}
): Promise<LinkingResult[]> {
  const results: LinkingResult[] = [];

  // Process sequentially to avoid rate limiting
  for (const premise of premises) {
    const result = await linkPremiseToEvidence(premise, projectId, options);
    results.push(result);
  }

  return results;
}

/**
 * Get supporting evidence only
 */
export function filterSupportingEvidence(
  linkedEvidence: LinkedEvidence[]
): LinkedEvidence[] {
  return linkedEvidence.filter(
    (e) => e.relationship === 'supports' || e.relationship === 'partial_support'
  );
}

/**
 * Get refuting evidence only
 */
export function filterRefutingEvidence(
  linkedEvidence: LinkedEvidence[]
): LinkedEvidence[] {
  return linkedEvidence.filter(
    (e) => e.relationship === 'refutes' || e.relationship === 'partial_refute'
  );
}

/**
 * Calculate coverage statistics for linked evidence
 */
export function calculateCoverageStats(linkedEvidence: LinkedEvidence[]): {
  supportCount: number;
  refuteCount: number;
  neutralCount: number;
  hasEvidence: boolean;
  netSupport: number;
  averageConfidence: number;
} {
  const supportCount = linkedEvidence.filter(
    (e) => e.relationship === 'supports' || e.relationship === 'partial_support'
  ).length;

  const refuteCount = linkedEvidence.filter(
    (e) => e.relationship === 'refutes' || e.relationship === 'partial_refute'
  ).length;

  const neutralCount = linkedEvidence.filter((e) => e.relationship === 'neutral').length;

  const averageConfidence =
    linkedEvidence.length > 0
      ? linkedEvidence.reduce((sum, e) => sum + e.confidence, 0) / linkedEvidence.length
      : 0;

  return {
    supportCount,
    refuteCount,
    neutralCount,
    hasEvidence: linkedEvidence.length > 0,
    netSupport: supportCount - refuteCount,
    averageConfidence,
  };
}

export default {
  linkPremiseToEvidence,
  linkPremisesBatch,
  filterSupportingEvidence,
  filterRefutingEvidence,
  calculateCoverageStats,
};
