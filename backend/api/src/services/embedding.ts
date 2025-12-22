import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { VECTOR_CONFIG } from '../config/vectordb';

// OpenAI client singleton
let openaiClient: OpenAI | null = null;

// Embedding model configuration
export const EMBEDDING_CONFIG = {
  model: 'text-embedding-3-large',
  dimensions: VECTOR_CONFIG.dimensions, // 1536
  maxInputLength: 8191, // Max tokens for text-embedding-3-large
  batchSize: 100, // Max texts per batch API call
};

/**
 * Get or initialize the OpenAI client
 */
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required for embedding generation');
    }

    openaiClient = new OpenAI({ apiKey });
    logger.info('OpenAI client initialized for embeddings');
  }

  return openaiClient;
}

/**
 * Check if embedding service is available
 */
export function isEmbeddingEnabled(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Truncate text to fit within token limits
 * Approximate: 1 token ≈ 4 characters for English text
 */
function truncateText(text: string, maxTokens: number = EMBEDDING_CONFIG.maxInputLength): string {
  const approxCharsPerToken = 4;
  const maxChars = maxTokens * approxCharsPerToken;

  if (text.length <= maxChars) {
    return text;
  }

  logger.warn(`Text truncated from ${text.length} to ${maxChars} characters for embedding`);
  return text.substring(0, maxChars);
}

/**
 * Generate embedding vector for a single text
 *
 * @param text - The text to embed
 * @returns Array of numbers representing the embedding vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Cannot generate embedding for empty text');
  }

  const client = getOpenAIClient();
  const truncatedText = truncateText(text.trim());

  try {
    const response = await client.embeddings.create({
      model: EMBEDDING_CONFIG.model,
      input: truncatedText,
      dimensions: EMBEDDING_CONFIG.dimensions,
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No embedding returned from OpenAI');
    }

    logger.debug(`Generated embedding for text (${truncatedText.length} chars)`);
    return response.data[0].embedding;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to generate embedding:', { error: errorMessage, textLength: text.length });
    throw new Error(`Embedding generation failed: ${errorMessage}`);
  }
}

/**
 * Generate embeddings for multiple texts in a batch
 * More efficient than calling generateEmbedding multiple times
 *
 * @param texts - Array of texts to embed
 * @returns Array of embedding vectors in the same order as input texts
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!texts || texts.length === 0) {
    return [];
  }

  // Filter and prepare texts
  const validTexts = texts.map((t) => truncateText(t?.trim() || ''));
  const nonEmptyIndices: number[] = [];
  const textsToEmbed: string[] = [];

  validTexts.forEach((text, index) => {
    if (text.length > 0) {
      nonEmptyIndices.push(index);
      textsToEmbed.push(text);
    }
  });

  if (textsToEmbed.length === 0) {
    // Return empty arrays for all inputs if all were empty
    return texts.map(() => []);
  }

  const client = getOpenAIClient();
  const allEmbeddings: number[][] = new Array(texts.length).fill(null).map(() => []);

  try {
    // Process in batches to respect API limits
    for (let i = 0; i < textsToEmbed.length; i += EMBEDDING_CONFIG.batchSize) {
      const batch = textsToEmbed.slice(i, i + EMBEDDING_CONFIG.batchSize);
      const batchIndices = nonEmptyIndices.slice(i, i + EMBEDDING_CONFIG.batchSize);

      const response = await client.embeddings.create({
        model: EMBEDDING_CONFIG.model,
        input: batch,
        dimensions: EMBEDDING_CONFIG.dimensions,
      });

      // Map embeddings back to original positions
      response.data.forEach((item, batchIndex) => {
        const originalIndex = batchIndices[batchIndex];
        allEmbeddings[originalIndex] = item.embedding;
      });

      logger.debug(`Generated batch embeddings: ${batch.length} texts processed`);
    }

    return allEmbeddings;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to generate batch embeddings:', { error: errorMessage, count: texts.length });
    throw new Error(`Batch embedding generation failed: ${errorMessage}`);
  }
}

/**
 * Calculate cosine similarity between two embedding vectors
 * Useful for local similarity comparisons without vector DB
 *
 * @param a - First embedding vector
 * @param b - Second embedding vector
 * @returns Similarity score between 0 and 1
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embedding vectors must have the same dimensions');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Health check for embedding service
 */
export async function checkEmbeddingHealth(): Promise<{
  healthy: boolean;
  message: string;
}> {
  if (!isEmbeddingEnabled()) {
    return {
      healthy: true,
      message: 'Embedding service not configured (optional feature)',
    };
  }

  try {
    // Test with a minimal embedding request
    const testEmbedding = await generateEmbedding('health check');

    if (testEmbedding.length !== EMBEDDING_CONFIG.dimensions) {
      return {
        healthy: false,
        message: `Unexpected embedding dimensions: ${testEmbedding.length} (expected ${EMBEDDING_CONFIG.dimensions})`,
      };
    }

    return {
      healthy: true,
      message: 'Embedding service operational',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      healthy: false,
      message: `Embedding service failed: ${errorMessage}`,
    };
  }
}

export default {
  generateEmbedding,
  generateEmbeddings,
  cosineSimilarity,
  isEmbeddingEnabled,
  checkEmbeddingHealth,
  EMBEDDING_CONFIG,
};
