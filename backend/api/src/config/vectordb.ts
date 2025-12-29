import { Pinecone } from '@pinecone-database/pinecone';
import { logger } from '../utils/logger';

// Configuration for vector database
export const VECTOR_CONFIG = {
  dimensions: 1536, // text-embedding-3-large dimensions
  metric: 'cosine' as const,
  indexName: process.env.PINECONE_INDEX_NAME || 'claim-mapper-evidence',
  namespace: process.env.PINECONE_NAMESPACE || 'evidence',
};

// Singleton instance
let pineconeInstance: Pinecone | null = null;

/**
 * Initialize and return the Pinecone client
 * Uses singleton pattern to avoid multiple connections
 */
export function getPineconeClient(): Pinecone {
  if (!pineconeInstance) {
    const apiKey = process.env.PINECONE_API_KEY;

    if (!apiKey) {
      logger.warn('PINECONE_API_KEY not configured - vector DB features disabled');
      throw new Error('PINECONE_API_KEY environment variable is required');
    }

    pineconeInstance = new Pinecone({
      apiKey,
    });

    logger.info('Pinecone client initialized');
  }

  return pineconeInstance;
}

/**
 * Get the evidence index for vector operations
 */
export function getEvidenceIndex() {
  const client = getPineconeClient();
  return client.index(VECTOR_CONFIG.indexName);
}

/**
 * Check if vector database is configured and available
 */
export function isVectorDbEnabled(): boolean {
  return !!process.env.PINECONE_API_KEY && !!process.env.PINECONE_INDEX_NAME;
}

/**
 * Health check for vector database connection
 */
export async function checkVectorDbHealth(): Promise<{
  healthy: boolean;
  message: string;
  details?: Record<string, unknown>;
}> {
  if (!isVectorDbEnabled()) {
    return {
      healthy: true,
      message: 'Vector DB not configured (optional feature)',
    };
  }

  try {
    const client = getPineconeClient();
    const indexList = await client.listIndexes();

    const indexExists = indexList.indexes?.some(
      (idx) => idx.name === VECTOR_CONFIG.indexName
    );

    if (!indexExists) {
      return {
        healthy: false,
        message: `Index '${VECTOR_CONFIG.indexName}' not found in Pinecone`,
        details: {
          availableIndexes: indexList.indexes?.map((i) => i.name) || [],
        },
      };
    }

    // Get index stats to verify it's operational
    const index = getEvidenceIndex();
    const stats = await index.describeIndexStats();

    return {
      healthy: true,
      message: 'Vector DB connected and operational',
      details: {
        indexName: VECTOR_CONFIG.indexName,
        totalVectors: stats.totalRecordCount || 0,
        dimensions: stats.dimension,
        namespaces: stats.namespaces,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Vector DB health check failed:', { error: errorMessage });

    return {
      healthy: false,
      message: `Vector DB connection failed: ${errorMessage}`,
    };
  }
}

export default {
  getPineconeClient,
  getEvidenceIndex,
  isVectorDbEnabled,
  checkVectorDbHealth,
  VECTOR_CONFIG,
};
