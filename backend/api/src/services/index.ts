/**
 * Services barrel export
 *
 * Centralized export for all backend services including:
 * - Embedding generation (OpenAI)
 * - Vector database operations (Pinecone)
 * - Document ingestion pipeline
 */

// Embedding service
export {
  generateEmbedding,
  generateEmbeddings,
  cosineSimilarity,
  isEmbeddingEnabled,
  checkEmbeddingHealth,
  EMBEDDING_CONFIG,
} from './embedding';

// Vector store service
export {
  upsertEvidence,
  upsertEvidenceBatch,
  searchSimilar,
  searchByProject,
  deleteEvidence,
  deleteEvidenceBatch,
  deleteByProject,
  getVectorStats,
  checkDuplicate,
} from './vectorStore';

export type {
  VectorMetadata,
  SimilarityResult,
  UpsertOptions,
  SearchOptions,
} from './vectorStore';

// Document ingestion pipeline
export {
  ingestDocument,
  ingestFromUrl,
  chunkText,
  CHUNK_PRESETS,
  estimateTokens,
  splitIntoSentences,
} from './ingestion';

export type {
  IngestionSource,
  IngestionOptions,
  IngestionResult,
  Chunk,
  ChunkOptions,
} from './ingestion';

// Semantic linking pipeline
export {
  linkPremiseToEvidence,
  linkPremisesBatch,
  filterSupportingEvidence,
  filterRefutingEvidence,
  calculateCoverageStats,
  rerank,
  isRerankerEnabled,
  classifyRelationship,
  classifyRelationshipsBatch,
  isClassifierEnabled,
} from './linking';

export type {
  LinkedEvidence,
  LinkingOptions,
  LinkingResult,
  RerankResult,
  Relationship,
  ClassificationResult,
  LLMProvider,
} from './linking';
