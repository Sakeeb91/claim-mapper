import { logger } from '../../utils/logger';

/**
 * A chunk of text extracted from a document
 */
export interface Chunk {
  text: string;
  startIndex: number;
  endIndex: number;
  chunkIndex: number;
  metadata: {
    section?: string;
    pageNumber?: number;
    heading?: string;
  };
}

/**
 * Options for text chunking
 */
export interface ChunkOptions {
  /** Maximum size of each chunk in characters (default: 1000) */
  maxChunkSize?: number;
  /** Size of overlap between chunks for context preservation (default: 100) */
  overlapSize?: number;
  /** What to split on: 'sentence' or 'paragraph' (default: 'paragraph') */
  splitOn?: 'sentence' | 'paragraph';
  /** Minimum chunk size to keep (default: 50) */
  minChunkSize?: number;
  /** Whether to preserve section headers (default: true) */
  preserveHeaders?: boolean;
}

/**
 * Default chunking options
 */
const DEFAULT_OPTIONS: Required<ChunkOptions> = {
  maxChunkSize: 1000,
  overlapSize: 100,
  splitOn: 'paragraph',
  minChunkSize: 50,
  preserveHeaders: true,
};

/**
 * Split text into chunks with overlap for context preservation
 *
 * @param text - The text to split into chunks
 * @param options - Chunking options
 * @returns Array of text chunks with metadata
 */
export function chunkText(text: string, options: ChunkOptions = {}): Chunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (!text || text.trim().length === 0) {
    return [];
  }

  // Normalize whitespace
  const normalizedText = text.replace(/\r\n/g, '\n').trim();

  // Split based on strategy
  const splitRegex = opts.splitOn === 'paragraph'
    ? /\n\n+/
    : /(?<=[.!?])\s+(?=[A-Z])/;

  const segments = normalizedText.split(splitRegex);

  // Build chunks with overlap
  const chunks: Chunk[] = [];
  let currentChunk = '';
  let currentStartIndex = 0;
  let chunkIndex = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i].trim();

    if (!segment) continue;

    // Check if adding this segment would exceed max size
    if (currentChunk.length + segment.length + 2 > opts.maxChunkSize && currentChunk.length > 0) {
      // Save current chunk
      if (currentChunk.length >= opts.minChunkSize) {
        chunks.push({
          text: currentChunk.trim(),
          startIndex: currentStartIndex,
          endIndex: currentStartIndex + currentChunk.length,
          chunkIndex,
          metadata: extractMetadata(currentChunk, opts.preserveHeaders),
        });
        chunkIndex++;
      }

      // Start new chunk with overlap from previous
      const overlapText = getOverlapText(currentChunk, opts.overlapSize);
      currentStartIndex += currentChunk.length - overlapText.length;
      currentChunk = overlapText + (overlapText ? '\n\n' : '') + segment;
    } else {
      // Add segment to current chunk
      if (currentChunk) {
        currentChunk += opts.splitOn === 'paragraph' ? '\n\n' : ' ';
      }
      currentChunk += segment;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length >= opts.minChunkSize) {
    chunks.push({
      text: currentChunk.trim(),
      startIndex: currentStartIndex,
      endIndex: currentStartIndex + currentChunk.length,
      chunkIndex,
      metadata: extractMetadata(currentChunk, opts.preserveHeaders),
    });
  }

  logger.debug(`Chunked text into ${chunks.length} chunks (avg size: ${
    chunks.length > 0 ? Math.round(chunks.reduce((a, c) => a + c.text.length, 0) / chunks.length) : 0
  } chars)`);

  return chunks;
}

/**
 * Get the last N characters of text for overlap, respecting word boundaries
 */
function getOverlapText(text: string, overlapSize: number): string {
  if (text.length <= overlapSize) {
    return text;
  }

  // Get last N characters
  let overlap = text.slice(-overlapSize);

  // Find first word boundary to avoid cutting words
  const firstSpace = overlap.indexOf(' ');
  if (firstSpace > 0 && firstSpace < overlapSize / 2) {
    overlap = overlap.slice(firstSpace + 1);
  }

  return overlap.trim();
}

/**
 * Extract metadata from chunk text (headers, section info)
 */
function extractMetadata(
  text: string,
  preserveHeaders: boolean
): Chunk['metadata'] {
  const metadata: Chunk['metadata'] = {};

  if (!preserveHeaders) {
    return metadata;
  }

  // Try to find a heading at the start (# Markdown style or CAPS style)
  const headingMatch = text.match(/^(?:#{1,6}\s+(.+)|([A-Z][A-Z\s]{2,}[A-Z]))\n/);
  if (headingMatch) {
    metadata.heading = (headingMatch[1] || headingMatch[2]).trim();
  }

  // Try to extract section info from common patterns
  const sectionMatch = text.match(/(?:Section|Chapter|Part)\s+(\d+|[IVXLCDM]+)/i);
  if (sectionMatch) {
    metadata.section = sectionMatch[0];
  }

  return metadata;
}

/**
 * Estimate the number of tokens in a text
 * Approximation: ~4 characters per token for English
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split a text into sentence-level chunks
 * Useful for fine-grained claim extraction
 */
export function splitIntoSentences(text: string): string[] {
  if (!text) return [];

  // More sophisticated sentence splitting
  const sentences = text
    .replace(/([.!?])\s*(?=[A-Z])/g, '$1\n')
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return sentences;
}

/**
 * Chunk options optimized for different use cases
 */
export const CHUNK_PRESETS = {
  /** For detailed claim extraction - smaller chunks */
  detailed: {
    maxChunkSize: 500,
    overlapSize: 50,
    splitOn: 'sentence' as const,
    minChunkSize: 30,
  },
  /** For general document processing - medium chunks */
  standard: {
    maxChunkSize: 1000,
    overlapSize: 100,
    splitOn: 'paragraph' as const,
    minChunkSize: 50,
  },
  /** For summarization - larger chunks */
  summary: {
    maxChunkSize: 2000,
    overlapSize: 200,
    splitOn: 'paragraph' as const,
    minChunkSize: 100,
  },
  /** For academic papers - preserve structure */
  academic: {
    maxChunkSize: 1500,
    overlapSize: 150,
    splitOn: 'paragraph' as const,
    minChunkSize: 75,
    preserveHeaders: true,
  },
};

export default {
  chunkText,
  splitIntoSentences,
  estimateTokens,
  CHUNK_PRESETS,
};
