/**
 * Linking Services Barrel Export
 *
 * Centralized export for the semantic linking pipeline services:
 * - Matcher: Orchestrates the full linking pipeline
 * - Reranker: Cross-encoder reranking for precision
 * - Classifier: Relationship classification (supports/refutes/neutral)
 *
 * @module services/linking
 */

// Matcher service - main entry point
export {
  linkPremiseToEvidence,
  linkPremisesBatch,
  filterSupportingEvidence,
  filterRefutingEvidence,
  calculateCoverageStats,
} from './matcher';

export type {
  LinkedEvidence,
  LinkingOptions,
  LinkingResult,
} from './matcher';

// Reranker service
export {
  rerank,
  isRerankerEnabled,
} from './reranker';

export type {
  RerankResult,
} from './reranker';

// Classifier service
export {
  classifyRelationship,
  classifyRelationshipsBatch,
  isClassifierEnabled,
} from './classifier';

export type {
  Relationship,
  ClassificationResult,
  LLMProvider,
} from './classifier';
