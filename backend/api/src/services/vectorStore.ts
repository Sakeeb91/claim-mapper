import { RecordMetadata } from '@pinecone-database/pinecone';
import { getEvidenceIndex, isVectorDbEnabled, VECTOR_CONFIG } from '../config/vectordb';
import { generateEmbedding, generateEmbeddings } from './embedding';
import { logger } from '../utils/logger';

/**
 * Metadata stored with each vector in Pinecone
 * All fields are required to avoid undefined values
 */
export interface VectorMetadata {
  text: string;
  evidenceType: string;
  sourceType: string;
  sourceUrl: string;
  sourceTitle: string;
  projectId: string;
  createdAt: string;
  reliabilityScore: number;
  keywords: string[];
}

/**
 * Parse Pinecone metadata into our VectorMetadata type with defaults
 */
function parseVectorMetadata(metadata: RecordMetadata | undefined): VectorMetadata {
  if (!metadata) {
    return {
      text: '',
      evidenceType: 'unknown',
      sourceType: 'unknown',
      sourceUrl: '',
      sourceTitle: '',
      projectId: '',
      createdAt: new Date().toISOString(),
      reliabilityScore: 0,
      keywords: [],
    };
  }

  return {
    text: String(metadata.text || ''),
    evidenceType: String(metadata.evidenceType || 'unknown'),
    sourceType: String(metadata.sourceType || 'unknown'),
    sourceUrl: String(metadata.sourceUrl || ''),
    sourceTitle: String(metadata.sourceTitle || ''),
    projectId: String(metadata.projectId || ''),
    createdAt: String(metadata.createdAt || new Date().toISOString()),
    reliabilityScore: Number(metadata.reliabilityScore || 0),
    keywords: Array.isArray(metadata.keywords) ? metadata.keywords.map(String) : [],
  };
}

/**
 * Result from a similarity search
 */
export interface SimilarityResult {
  id: string;
  score: number;
  metadata: VectorMetadata;
}

/**
 * Options for upserting evidence to vector database
 */
export interface UpsertOptions {
  id: string;
  text: string;
  metadata: Omit<VectorMetadata, 'text'>;
}

/**
 * Options for similarity search
 */
export interface SearchOptions {
  topK?: number;
  filter?: Record<string, string | number | boolean>;
  minScore?: number;
  includeMetadata?: boolean;
}

/**
 * Upsert a single evidence item to the vector database
 *
 * @param options - The evidence data to upsert
 */
export async function upsertEvidence(options: UpsertOptions): Promise<void> {
  if (!isVectorDbEnabled()) {
    logger.debug('Vector DB not enabled, skipping upsert');
    return;
  }

  const { id, text, metadata } = options;

  if (!text || text.trim().length === 0) {
    logger.warn(`Skipping upsert for evidence ${id}: empty text`);
    return;
  }

  try {
    const embedding = await generateEmbedding(text);
    const index = getEvidenceIndex();

    await index.namespace(VECTOR_CONFIG.namespace).upsert([
      {
        id,
        values: embedding,
        metadata: {
          text: text.substring(0, 1000), // Store truncated text for retrieval
          ...metadata,
        },
      },
    ]);

    logger.info(`Upserted evidence ${id} to vector DB`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to upsert evidence ${id} to vector DB:`, { error: errorMessage });
    // Don't throw - allow MongoDB operation to succeed
  }
}

/**
 * Upsert multiple evidence items in batch
 * More efficient than calling upsertEvidence multiple times
 *
 * @param items - Array of evidence items to upsert
 */
export async function upsertEvidenceBatch(items: UpsertOptions[]): Promise<{
  success: number;
  failed: number;
  errors: string[];
}> {
  if (!isVectorDbEnabled()) {
    logger.debug('Vector DB not enabled, skipping batch upsert');
    return { success: 0, failed: 0, errors: [] };
  }

  const validItems = items.filter((item) => item.text && item.text.trim().length > 0);

  if (validItems.length === 0) {
    return { success: 0, failed: items.length, errors: ['All items had empty text'] };
  }

  const results = { success: 0, failed: 0, errors: [] as string[] };

  try {
    // Generate embeddings in batch
    const texts = validItems.map((item) => item.text);
    const embeddings = await generateEmbeddings(texts);

    // Prepare vectors for upsert
    const vectors = validItems.map((item, index) => ({
      id: item.id,
      values: embeddings[index],
      metadata: {
        text: item.text.substring(0, 1000),
        ...item.metadata,
      },
    }));

    // Upsert in batches of 100 (Pinecone limit)
    const index = getEvidenceIndex();
    const batchSize = 100;

    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);

      try {
        await index.namespace(VECTOR_CONFIG.namespace).upsert(batch);
        results.success += batch.length;
        logger.debug(`Batch upsert: ${batch.length} vectors processed`);
      } catch (batchError) {
        results.failed += batch.length;
        const errorMsg = batchError instanceof Error ? batchError.message : 'Batch upsert failed';
        results.errors.push(errorMsg);
        logger.error('Batch upsert failed:', { error: errorMsg });
      }
    }

    logger.info(`Batch upsert complete: ${results.success} success, ${results.failed} failed`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    results.failed = validItems.length;
    results.errors.push(errorMessage);
    logger.error('Batch embedding generation failed:', { error: errorMessage });
  }

  return results;
}

/**
 * Search for similar evidence using semantic similarity
 *
 * @param query - The query text to find similar evidence for
 * @param options - Search options (topK, filter, minScore)
 * @returns Array of similar evidence with scores
 */
export async function searchSimilar(
  query: string,
  options: SearchOptions = {}
): Promise<SimilarityResult[]> {
  if (!isVectorDbEnabled()) {
    logger.debug('Vector DB not enabled, returning empty results');
    return [];
  }

  const { topK = 10, filter, minScore = 0.0, includeMetadata = true } = options;

  if (!query || query.trim().length === 0) {
    return [];
  }

  try {
    const queryEmbedding = await generateEmbedding(query);
    const index = getEvidenceIndex();

    const queryOptions: {
      vector: number[];
      topK: number;
      filter?: Record<string, string | number | boolean>;
      includeMetadata: boolean;
    } = {
      vector: queryEmbedding,
      topK,
      includeMetadata,
    };

    if (filter && Object.keys(filter).length > 0) {
      queryOptions.filter = filter;
    }

    const results = await index.namespace(VECTOR_CONFIG.namespace).query(queryOptions);

    const matches: SimilarityResult[] = (results.matches || [])
      .filter((match) => (match.score || 0) >= minScore)
      .map((match) => ({
        id: match.id,
        score: match.score || 0,
        metadata: parseVectorMetadata(match.metadata),
      }));

    logger.debug(`Semantic search returned ${matches.length} results for query`);
    return matches;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Semantic search failed:', { error: errorMessage });
    throw new Error(`Semantic search failed: ${errorMessage}`);
  }
}

/**
 * Search for evidence by project with semantic similarity
 *
 * @param query - The query text
 * @param projectId - The project to search within
 * @param options - Additional search options
 */
export async function searchByProject(
  query: string,
  projectId: string,
  options: Omit<SearchOptions, 'filter'> = {}
): Promise<SimilarityResult[]> {
  return searchSimilar(query, {
    ...options,
    filter: { projectId },
  });
}

/**
 * Delete a single evidence vector from the database
 *
 * @param id - The evidence ID to delete
 */
export async function deleteEvidence(id: string): Promise<void> {
  if (!isVectorDbEnabled()) {
    logger.debug('Vector DB not enabled, skipping delete');
    return;
  }

  try {
    const index = getEvidenceIndex();
    await index.namespace(VECTOR_CONFIG.namespace).deleteOne(id);
    logger.info(`Deleted evidence ${id} from vector DB`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to delete evidence ${id} from vector DB:`, { error: errorMessage });
    // Don't throw - allow MongoDB operation to succeed
  }
}

/**
 * Delete multiple evidence vectors in batch
 *
 * @param ids - Array of evidence IDs to delete
 */
export async function deleteEvidenceBatch(ids: string[]): Promise<{
  success: number;
  failed: number;
}> {
  if (!isVectorDbEnabled()) {
    logger.debug('Vector DB not enabled, skipping batch delete');
    return { success: 0, failed: 0 };
  }

  if (!ids || ids.length === 0) {
    return { success: 0, failed: 0 };
  }

  try {
    const index = getEvidenceIndex();
    await index.namespace(VECTOR_CONFIG.namespace).deleteMany(ids);
    logger.info(`Batch deleted ${ids.length} vectors from vector DB`);
    return { success: ids.length, failed: 0 };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Batch delete failed:', { error: errorMessage });
    return { success: 0, failed: ids.length };
  }
}

/**
 * Delete all vectors for a specific project
 * Useful when a project is deleted
 *
 * @param projectId - The project ID whose vectors should be deleted
 */
export async function deleteByProject(projectId: string): Promise<void> {
  if (!isVectorDbEnabled()) {
    return;
  }

  try {
    const index = getEvidenceIndex();
    // Pinecone doesn't support delete by filter in all tiers,
    // so we may need to query and delete in batches
    await index.namespace(VECTOR_CONFIG.namespace).deleteMany({
      filter: { projectId },
    });
    logger.info(`Deleted all vectors for project ${projectId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to delete vectors for project ${projectId}:`, { error: errorMessage });
  }
}

/**
 * Get statistics about the vector database
 */
export async function getVectorStats(): Promise<{
  totalVectors: number;
  dimension: number;
  namespaces: Record<string, { vectorCount: number }>;
} | null> {
  if (!isVectorDbEnabled()) {
    return null;
  }

  try {
    const index = getEvidenceIndex();
    const stats = await index.describeIndexStats();

    // Convert namespace stats to our format
    const namespaces: Record<string, { vectorCount: number }> = {};
    if (stats.namespaces) {
      for (const [key, value] of Object.entries(stats.namespaces)) {
        namespaces[key] = { vectorCount: value.recordCount || 0 };
      }
    }

    return {
      totalVectors: stats.totalRecordCount || 0,
      dimension: stats.dimension || VECTOR_CONFIG.dimensions,
      namespaces,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to get vector stats:', { error: errorMessage });
    return null;
  }
}

/**
 * Check for duplicate evidence using semantic similarity
 *
 * @param text - The text to check for duplicates
 * @param projectId - The project to check within
 * @param threshold - Similarity threshold for duplicate detection (default 0.92)
 */
export async function checkDuplicate(
  text: string,
  projectId: string,
  threshold: number = 0.92
): Promise<{
  isDuplicate: boolean;
  duplicateOf?: string;
  similarity?: number;
}> {
  if (!isVectorDbEnabled()) {
    return { isDuplicate: false };
  }

  try {
    const results = await searchByProject(text, projectId, { topK: 1 });

    if (results.length === 0) {
      return { isDuplicate: false };
    }

    const topMatch = results[0];

    if (topMatch.score >= threshold) {
      return {
        isDuplicate: true,
        duplicateOf: topMatch.id,
        similarity: topMatch.score,
      };
    }

    return { isDuplicate: false };
  } catch (error) {
    logger.error('Duplicate check failed:', error);
    return { isDuplicate: false };
  }
}

export default {
  upsertEvidence,
  upsertEvidenceBatch,
  searchSimilar,
  searchByProject,
  deleteEvidence,
  deleteEvidenceBatch,
  deleteByProject,
  getVectorStats,
  checkDuplicate,
};
