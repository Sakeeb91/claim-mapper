import axios from 'axios';
import mongoose from 'mongoose';
import { chunkText, ChunkOptions, Chunk, CHUNK_PRESETS } from './chunker';
import { checkDuplicate } from '../vectorStore';
import { logger } from '../../utils/logger';

// ML Service URL for claim extraction
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8002';

/**
 * Source information for ingested documents
 */
export interface IngestionSource {
  url?: string;
  title: string;
  type: 'document' | 'url' | 'text' | 'pdf' | 'html';
  author?: string;
  publication?: string;
  publishedDate?: Date;
  accessedDate?: Date;
}

/**
 * Options for document ingestion
 */
export interface IngestionOptions {
  /** Chunking options (defaults to standard preset) */
  chunkOptions?: ChunkOptions;
  /** Minimum confidence for extracted claims (default: 0.6) */
  confidenceThreshold?: number;
  /** Whether to check for duplicates before creating evidence (default: true) */
  checkDuplicates?: boolean;
  /** Duplicate similarity threshold (default: 0.92) */
  duplicateThreshold?: number;
  /** Whether to extract entities from text (default: true) */
  extractEntities?: boolean;
  /** Maximum chunks to process (0 = unlimited) */
  maxChunks?: number;
}

/**
 * Result from a document ingestion
 */
export interface IngestionResult {
  /** Unique artifact ID for this ingestion */
  artifactId: string;
  /** Number of text chunks processed */
  chunksProcessed: number;
  /** Number of claims extracted from text */
  claimsExtracted: number;
  /** Number of evidence documents created */
  evidenceCreated: number;
  /** IDs of created evidence documents */
  evidenceIds: string[];
  /** Number of duplicates skipped */
  duplicatesSkipped: number;
  /** Any errors encountered during processing */
  errors: string[];
  /** Processing time in milliseconds */
  processingTime: number;
  /** Source metadata */
  source: IngestionSource;
}

/**
 * Claim extracted by the ML service
 */
interface ExtractedClaim {
  text: string;
  type: string;
  confidence: number;
  original_span?: {
    start: number;
    end: number;
  };
  related_evidence?: string[];
}

/**
 * Default ingestion options
 */
const DEFAULT_OPTIONS: Required<IngestionOptions> = {
  chunkOptions: CHUNK_PRESETS.standard,
  confidenceThreshold: 0.6,
  checkDuplicates: true,
  duplicateThreshold: 0.92,
  extractEntities: true,
  maxChunks: 0,
};

/**
 * Ingest a document and extract claims as evidence
 *
 * This is the main entry point for the ingestion pipeline:
 * 1. Chunk the document into manageable pieces
 * 2. Extract claims from each chunk using the ML service
 * 3. Check for duplicates (optional)
 * 4. Create Evidence documents in MongoDB
 * 5. Vector sync happens automatically via post-save hooks
 *
 * @param text - The document text to ingest
 * @param source - Source metadata for the document
 * @param projectId - The project to add evidence to
 * @param userId - The user performing the ingestion
 * @param options - Ingestion options
 */
export async function ingestDocument(
  text: string,
  source: IngestionSource,
  projectId: string,
  userId: string,
  options: IngestionOptions = {}
): Promise<IngestionResult> {
  const startTime = Date.now();
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const result: IngestionResult = {
    artifactId: `artifact_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    chunksProcessed: 0,
    claimsExtracted: 0,
    evidenceCreated: 0,
    evidenceIds: [],
    duplicatesSkipped: 0,
    errors: [],
    processingTime: 0,
    source,
  };

  if (!text || text.trim().length === 0) {
    result.errors.push('Empty document provided');
    result.processingTime = Date.now() - startTime;
    return result;
  }

  try {
    // Step 1: Chunk the document
    const chunks = chunkText(text, opts.chunkOptions);
    const chunksToProcess = opts.maxChunks > 0
      ? chunks.slice(0, opts.maxChunks)
      : chunks;

    logger.info(`Ingestion started: ${chunksToProcess.length} chunks to process for ${source.title} (${result.artifactId})`);

    // Step 2: Process each chunk
    for (const chunk of chunksToProcess) {
      try {
        await processChunk(chunk, source, projectId, userId, opts, result);
        result.chunksProcessed++;
      } catch (chunkError) {
        const errorMsg = chunkError instanceof Error ? chunkError.message : 'Unknown chunk error';
        result.errors.push(`Chunk ${chunk.chunkIndex}: ${errorMsg}`);
        logger.error(`Failed to process chunk ${chunk.chunkIndex}:`, { error: errorMsg });
      }
    }

    logger.info(`Ingestion completed: ${result.evidenceCreated} evidence created, ${result.claimsExtracted} claims extracted (${result.artifactId})`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Ingestion failed: ${errorMsg}`);
    logger.error('Ingestion failed:', { error: errorMsg, artifactId: result.artifactId });
  }

  result.processingTime = Date.now() - startTime;
  return result;
}

/**
 * Process a single chunk of text
 */
async function processChunk(
  chunk: Chunk,
  source: IngestionSource,
  projectId: string,
  userId: string,
  opts: Required<IngestionOptions>,
  result: IngestionResult
): Promise<void> {
  // Extract claims from chunk via ML service
  const claims = await extractClaimsFromChunk(chunk.text, opts);

  result.claimsExtracted += claims.length;

  // Create evidence for each claim
  for (const claim of claims) {
    try {
      await createEvidenceFromClaim(
        claim,
        chunk,
        source,
        projectId,
        userId,
        opts,
        result
      );
    } catch (claimError) {
      const errorMsg = claimError instanceof Error ? claimError.message : 'Unknown claim error';
      result.errors.push(`Claim creation failed: ${errorMsg}`);
    }
  }
}

/**
 * Extract claims from a chunk of text using the ML service
 */
async function extractClaimsFromChunk(
  text: string,
  opts: Required<IngestionOptions>
): Promise<ExtractedClaim[]> {
  try {
    const response = await axios.post(
      `${ML_SERVICE_URL}/extract-claims`,
      {
        text,
        extract_evidence: false,
        confidence_threshold: opts.confidenceThreshold,
      },
      {
        timeout: 30000, // 30 second timeout
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.data || !response.data.claims) {
      return [];
    }

    // Filter by confidence threshold
    return (response.data.claims as ExtractedClaim[]).filter(
      (claim) => claim.confidence >= opts.confidenceThreshold
    );
  } catch (error) {
    // If ML service is unavailable, log warning but don't fail
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.warn(`ML claim extraction failed: ${errorMsg}`);

    // Fallback: treat the entire chunk as a single claim
    return [{
      text: text.substring(0, 1000),
      type: 'ASSERTION',
      confidence: 0.5,
    }];
  }
}

/**
 * Create an Evidence document from an extracted claim
 */
async function createEvidenceFromClaim(
  claim: ExtractedClaim,
  chunk: Chunk,
  source: IngestionSource,
  projectId: string,
  userId: string,
  opts: Required<IngestionOptions>,
  result: IngestionResult
): Promise<void> {
  // Check for duplicates if enabled
  if (opts.checkDuplicates) {
    const duplicateCheck = await checkDuplicate(
      claim.text,
      projectId,
      opts.duplicateThreshold
    );

    if (duplicateCheck.isDuplicate) {
      result.duplicatesSkipped++;
      logger.debug(`Skipping duplicate claim (similar to ${duplicateCheck.duplicateOf})`);
      return;
    }
  }

  // Import Evidence model dynamically to avoid circular dependencies
  const Evidence = mongoose.model('Evidence');

  // Map claim type to evidence type
  const evidenceType = mapClaimTypeToEvidenceType(claim.type);

  // Create the evidence document
  const evidence = await Evidence.create({
    text: claim.text,
    type: evidenceType,
    source: {
      type: source.type === 'pdf' ? 'document' : source.type,
      reference: source.title,
      title: source.title,
      author: source.author,
      publication: source.publication,
      publishedDate: source.publishedDate,
      accessedDate: source.accessedDate || new Date(),
      url: source.url,
    },
    reliability: {
      score: Math.min(claim.confidence, 0.8), // Cap initial reliability
      factors: {
        sourceCredibility: 0.6, // Default, can be updated later
        methodologyQuality: 0.5,
        replication: 0.5,
        peerReview: false,
        biasAssessment: 0.5,
      },
    },
    relevance: {
      score: 0.7, // Default relevance
      contextual: true,
      temporal: true,
      geographical: true,
      demographic: true,
    },
    project: new mongoose.Types.ObjectId(projectId),
    addedBy: new mongoose.Types.ObjectId(userId),
    keywords: extractKeywords(claim.text),
    metadata: {
      extractionMethod: 'automated_ingestion',
      confidence: claim.confidence,
      processingDate: new Date(),
      artifactId: result.artifactId,
      chunkIndex: chunk.chunkIndex,
      originalSpan: claim.original_span,
    },
    quality: {
      overallScore: 0.5,
      completenessScore: 0.5,
      accuracyScore: 0.5,
      objectivityScore: 0.5,
      timelinessScore: 0.5,
      issues: [],
      recommendations: ['Review automated extraction for accuracy'],
    },
    verification: {
      status: 'unverified',
    },
    vectorSync: {
      status: 'pending',
    },
    isActive: true,
  });

  result.evidenceIds.push(evidence._id.toString());
  result.evidenceCreated++;
}

/**
 * Map ML claim types to evidence types
 */
function mapClaimTypeToEvidenceType(
  claimType: string
): 'empirical' | 'statistical' | 'testimonial' | 'expert' | 'documented' | 'anecdotal' {
  const typeMap: Record<string, 'empirical' | 'statistical' | 'testimonial' | 'expert' | 'documented' | 'anecdotal'> = {
    'ASSERTION': 'documented',
    'HYPOTHESIS': 'testimonial',
    'QUESTION': 'anecdotal',
    'FACT': 'empirical',
    'STATISTIC': 'statistical',
    'OPINION': 'testimonial',
    'EXPERT_OPINION': 'expert',
    'factual': 'empirical',
    'causal': 'empirical',
    'statistical': 'statistical',
    'evaluative': 'testimonial',
    'prescriptive': 'documented',
  };

  return typeMap[claimType.toUpperCase()] || typeMap[claimType.toLowerCase()] || 'documented';
}

/**
 * Extract keywords from claim text
 * Simple keyword extraction - could be enhanced with ML
 */
function extractKeywords(text: string): string[] {
  // Remove common words and extract meaningful terms
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'must', 'shall', 'of', 'to', 'in',
    'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'between', 'under',
    'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
    'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some',
    'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
    'too', 'very', 's', 't', 'just', 'don', 'now', 'and', 'but', 'or',
    'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them',
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word));

  // Get unique words, max 10
  const unique = [...new Set(words)];
  return unique.slice(0, 10);
}

/**
 * Ingest a document from a URL
 * Fetches content, then processes through the ingestion pipeline
 */
export async function ingestFromUrl(
  url: string,
  projectId: string,
  userId: string,
  options: IngestionOptions = {}
): Promise<IngestionResult> {
  try {
    // Fetch the URL content
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'ClaimMapper/1.0 (Document Ingestion)',
      },
    });

    // Extract text from HTML (basic implementation)
    let text = response.data;
    if (typeof text === 'string' && text.includes('<html')) {
      text = stripHtml(text);
    }

    // Create source info
    const source: IngestionSource = {
      url,
      title: extractTitleFromUrl(url),
      type: 'url',
      accessedDate: new Date(),
    };

    return ingestDocument(text, source, projectId, userId, options);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return {
      artifactId: `artifact_${Date.now()}_failed`,
      chunksProcessed: 0,
      claimsExtracted: 0,
      evidenceCreated: 0,
      evidenceIds: [],
      duplicatesSkipped: 0,
      errors: [`Failed to fetch URL: ${errorMsg}`],
      processingTime: 0,
      source: {
        url,
        title: url,
        type: 'url',
      },
    };
  }
}

/**
 * Strip HTML tags from text (basic implementation)
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract a title from a URL
 */
function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname.split('/').filter(Boolean).pop() || urlObj.hostname;
    return path.replace(/[-_]/g, ' ').replace(/\.\w+$/, '');
  } catch {
    return url;
  }
}

// Re-export chunker utilities
export { chunkText, CHUNK_PRESETS, estimateTokens, splitIntoSentences } from './chunker';
export type { Chunk, ChunkOptions } from './chunker';

export default {
  ingestDocument,
  ingestFromUrl,
  chunkText,
  CHUNK_PRESETS,
};
