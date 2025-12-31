/**
 * Services barrel export
 *
 * Centralized export for all backend services including:
 * - Email service (Nodemailer + Bull queue)
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

// Deduplication service
export {
  checkForDuplicates,
  findDuplicateClusters,
  generateDeduplicationReport,
} from './deduplication';

export type {
  DuplicateCheckResult,
  DuplicateCluster,
  DeduplicationOptions,
  DeduplicationReport,
} from './deduplication';

// Email service
export {
  sendEmail,
  sendEmailImmediate,
  isEmailEnabled,
  verifyEmailConnection,
  getEmailQueueStats,
  closeEmailQueue,
  emailConfig,
  getTransporter,
  getEmailQueue,
} from './email';

export {
  renderPasswordResetEmail,
  renderInvitationEmail,
  renderWelcomeEmail,
  renderCollaborationEmail,
  renderUnsubscribeEmail,
} from './email';

export type {
  EmailConfig,
  EmailJobData,
  EmailResult,
  EmailStatus,
  EmailType,
  EmailAttachment,
  PasswordResetEmailData,
  InvitationEmailData,
  WelcomeEmailData,
  CollaborationEmailData,
} from './email';
