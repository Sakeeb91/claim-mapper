/**
 * Evidence Deduplication Service
 *
 * Provides enhanced duplicate detection and cluster identification
 * for the evidence corpus using semantic similarity.
 *
 * @module services/deduplication
 */

import { searchByProject, checkDuplicate as vectorCheckDuplicate } from './vectorStore';
import { logger } from '../utils/logger';
import Evidence from '../models/Evidence';

/**
 * Result from duplicate check
 */
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateOf?: string;
  similarity?: number;
  nearDuplicates?: Array<{
    id: string;
    similarity: number;
    text: string;
  }>;
}

/**
 * A cluster of semantically similar evidence
 */
export interface DuplicateCluster {
  clusterId: string;
  members: Array<{
    id: string;
    text: string;
    similarity: number;
  }>;
  representative: {
    id: string;
    text: string;
  };
}

/**
 * Options for duplicate detection
 */
export interface DeduplicationOptions {
  /** Threshold for exact duplicate (default: 0.95) */
  exactThreshold?: number;
  /** Threshold for near duplicate (default: 0.85) */
  nearThreshold?: number;
  /** Maximum near duplicates to return (default: 5) */
  maxNearDuplicates?: number;
}

const DEFAULT_OPTIONS: Required<DeduplicationOptions> = {
  exactThreshold: 0.95,
  nearThreshold: 0.85,
  maxNearDuplicates: 5,
};

/**
 * Check if text is a duplicate of existing evidence
 *
 * @param text - The text to check
 * @param projectId - The project to search within
 * @param options - Deduplication options
 * @returns Duplicate check result with near-duplicate information
 */
export async function checkForDuplicates(
  text: string,
  projectId: string,
  options: DeduplicationOptions = {}
): Promise<DuplicateCheckResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (!text || text.trim().length === 0) {
    return { isDuplicate: false };
  }

  try {
    // First check for exact duplicate using the vector store
    const exactCheck = await vectorCheckDuplicate(text, projectId, opts.exactThreshold);

    if (exactCheck.isDuplicate) {
      return {
        isDuplicate: true,
        duplicateOf: exactCheck.duplicateOf,
        similarity: exactCheck.similarity,
      };
    }

    // Search for near duplicates
    const candidates = await searchByProject(text, projectId, {
      topK: opts.maxNearDuplicates + 1,
      minScore: opts.nearThreshold,
    });

    const nearDuplicates = candidates
      .filter((c) => c.score < opts.exactThreshold && c.score >= opts.nearThreshold)
      .slice(0, opts.maxNearDuplicates)
      .map((c) => ({
        id: c.id,
        similarity: c.score,
        text: c.metadata.text,
      }));

    return {
      isDuplicate: false,
      nearDuplicates: nearDuplicates.length > 0 ? nearDuplicates : undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Duplicate check failed', { error: errorMessage, projectId });
    return { isDuplicate: false };
  }
}

/**
 * Find clusters of duplicate evidence within a project
 *
 * Uses a simple greedy clustering algorithm:
 * 1. Sort evidence by creation date
 * 2. For each evidence, find similar evidence not yet clustered
 * 3. Create cluster with the oldest item as representative
 *
 * @param projectId - The project to analyze
 * @param threshold - Similarity threshold for clustering (default: 0.90)
 * @returns Array of duplicate clusters
 */
export async function findDuplicateClusters(
  projectId: string,
  threshold: number = 0.90
): Promise<DuplicateCluster[]> {
  try {
    // Get all evidence for the project
    const allEvidence = await Evidence.find({
      project: projectId,
      isActive: true,
    })
      .select('_id text createdAt')
      .sort({ createdAt: 1 });

    if (allEvidence.length === 0) {
      return [];
    }

    const clusters: DuplicateCluster[] = [];
    const clustered = new Set<string>();

    for (const evidence of allEvidence) {
      const evidenceId = evidence._id.toString();

      // Skip if already clustered
      if (clustered.has(evidenceId)) {
        continue;
      }

      // Search for similar evidence
      const similar = await searchByProject(evidence.text, projectId, {
        topK: 20,
        minScore: threshold,
      });

      // Filter to only unclustered items and exclude self
      const clusterMembers = similar
        .filter((s) => s.id !== evidenceId && !clustered.has(s.id))
        .map((s) => ({
          id: s.id,
          text: s.metadata.text,
          similarity: s.score,
        }));

      // Only create cluster if there are duplicates
      if (clusterMembers.length > 0) {
        // Mark all as clustered
        clustered.add(evidenceId);
        clusterMembers.forEach((m) => clustered.add(m.id));

        clusters.push({
          clusterId: `cluster_${evidenceId}`,
          representative: {
            id: evidenceId,
            text: evidence.text,
          },
          members: [
            { id: evidenceId, text: evidence.text, similarity: 1.0 },
            ...clusterMembers,
          ],
        });
      }
    }

    logger.info('Duplicate cluster analysis completed', {
      projectId,
      totalEvidence: allEvidence.length,
      clustersFound: clusters.length,
      duplicatesIdentified: Array.from(clustered).length,
    });

    return clusters;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Duplicate cluster analysis failed', { error: errorMessage, projectId });
    return [];
  }
}

/**
 * Get deduplication report for a project
 */
export interface DeduplicationReport {
  projectId: string;
  totalEvidence: number;
  uniqueEvidence: number;
  duplicateCount: number;
  clusterCount: number;
  clusters: DuplicateCluster[];
  savingsPercentage: number;
}

/**
 * Generate a deduplication report for a project
 *
 * @param projectId - The project to analyze
 * @param threshold - Similarity threshold (default: 0.90)
 * @returns Deduplication report with statistics
 */
export async function generateDeduplicationReport(
  projectId: string,
  threshold: number = 0.90
): Promise<DeduplicationReport> {
  const totalCount = await Evidence.countDocuments({
    project: projectId,
    isActive: true,
  });

  const clusters = await findDuplicateClusters(projectId, threshold);

  // Calculate duplicates (cluster members - 1 per cluster)
  const duplicateCount = clusters.reduce(
    (sum, cluster) => sum + (cluster.members.length - 1),
    0
  );

  const uniqueCount = totalCount - duplicateCount;
  const savingsPercentage =
    totalCount > 0 ? Math.round((duplicateCount / totalCount) * 100) : 0;

  return {
    projectId,
    totalEvidence: totalCount,
    uniqueEvidence: uniqueCount,
    duplicateCount,
    clusterCount: clusters.length,
    clusters,
    savingsPercentage,
  };
}

export default {
  checkForDuplicates,
  findDuplicateClusters,
  generateDeduplicationReport,
};
