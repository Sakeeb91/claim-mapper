/**
 * Text Chunker Tests
 *
 * Tests for document chunking functionality used in the ingestion pipeline.
 */

import {
  chunkText,
  splitIntoSentences,
  estimateTokens,
  CHUNK_PRESETS,
} from '../ingestion/chunker';

describe('Text Chunker', () => {
  describe('chunkText', () => {
    it('should return empty array for empty input', () => {
      expect(chunkText('')).toEqual([]);
      expect(chunkText('   ')).toEqual([]);
    });

    it('should return single chunk for short text', () => {
      // Text must be at least minChunkSize (default 50) to be included
      const text = 'This is a short text that fits in one chunk and is long enough to pass the minimum size check.';
      const chunks = chunkText(text, { maxChunkSize: 1000, minChunkSize: 10 });

      expect(chunks).toHaveLength(1);
      expect(chunks[0].text).toBe(text);
      expect(chunks[0].chunkIndex).toBe(0);
    });

    it('should split long text into multiple chunks', () => {
      const paragraph = 'This is a paragraph with enough content to test chunking.';
      const text = Array(10).fill(paragraph).join('\n\n');

      const chunks = chunkText(text, { maxChunkSize: 200, overlapSize: 20 });

      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach((chunk, index) => {
        expect(chunk.chunkIndex).toBe(index);
        expect(chunk.text.length).toBeLessThanOrEqual(250); // Allow some buffer
      });
    });

    it('should preserve context with overlap', () => {
      const text = 'First paragraph with some content.\n\nSecond paragraph with different content.\n\nThird paragraph with more content.';

      const chunks = chunkText(text, {
        maxChunkSize: 60,
        overlapSize: 20,
        splitOn: 'paragraph',
      });

      // With small chunks and overlap, later chunks should contain some text from earlier
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('should respect minimum chunk size', () => {
      const text = 'Short.\n\nA.\n\nB.\n\nLonger paragraph with actual content.';

      const chunks = chunkText(text, {
        maxChunkSize: 100,
        minChunkSize: 20,
        splitOn: 'paragraph',
      });

      chunks.forEach((chunk) => {
        expect(chunk.text.length).toBeGreaterThanOrEqual(20);
      });
    });

    it('should use paragraph splitting by default', () => {
      // Each paragraph must exceed minChunkSize
      const text = 'First paragraph here with enough content to exceed the minimum.\n\nSecond paragraph here with enough content to exceed the minimum.';

      const chunks = chunkText(text, { maxChunkSize: 100, minChunkSize: 20 });

      // Should split on paragraph boundary
      expect(chunks.length).toBe(2);
    });

    it('should handle sentence splitting', () => {
      const text = 'First sentence. Second sentence. Third sentence.';

      const chunks = chunkText(text, {
        maxChunkSize: 40,
        splitOn: 'sentence',
        minChunkSize: 10,
      });

      expect(chunks.length).toBeGreaterThan(1);
    });

    it('should include startIndex and endIndex', () => {
      const text = 'First chunk.\n\nSecond chunk.';

      const chunks = chunkText(text, { maxChunkSize: 20 });

      chunks.forEach((chunk) => {
        expect(typeof chunk.startIndex).toBe('number');
        expect(typeof chunk.endIndex).toBe('number');
        expect(chunk.endIndex).toBeGreaterThan(chunk.startIndex);
      });
    });

    it('should extract heading metadata when preserveHeaders is true', () => {
      // Text must be at least minChunkSize
      const text = '# Main Heading\n\nThis is the content under the heading with enough text to pass the minimum.';

      const chunks = chunkText(text, {
        maxChunkSize: 1000,
        minChunkSize: 20,
        preserveHeaders: true,
      });

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].metadata.heading).toBe('Main Heading');
    });

    it('should not extract headers when preserveHeaders is false', () => {
      // Text must be at least minChunkSize
      const text = '# Main Heading\n\nContent here with enough text to pass the minimum chunk size requirement for testing.';

      const chunks = chunkText(text, {
        maxChunkSize: 1000,
        minChunkSize: 20,
        preserveHeaders: false,
      });

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].metadata.heading).toBeUndefined();
    });
  });

  describe('CHUNK_PRESETS', () => {
    it('should have standard preset', () => {
      expect(CHUNK_PRESETS.standard).toBeDefined();
      expect(CHUNK_PRESETS.standard.maxChunkSize).toBe(1000);
    });

    it('should have detailed preset with smaller chunks', () => {
      expect(CHUNK_PRESETS.detailed.maxChunkSize).toBeLessThan(
        CHUNK_PRESETS.standard.maxChunkSize
      );
    });

    it('should have summary preset with larger chunks', () => {
      expect(CHUNK_PRESETS.summary.maxChunkSize).toBeGreaterThan(
        CHUNK_PRESETS.standard.maxChunkSize
      );
    });

    it('should have academic preset with header preservation', () => {
      expect(CHUNK_PRESETS.academic.preserveHeaders).toBe(true);
    });
  });

  describe('splitIntoSentences', () => {
    it('should split text into sentences', () => {
      const text = 'First sentence. Second sentence! Third sentence?';

      const sentences = splitIntoSentences(text);

      expect(sentences).toHaveLength(3);
      expect(sentences[0]).toBe('First sentence.');
      expect(sentences[1]).toBe('Second sentence!');
      expect(sentences[2]).toBe('Third sentence?');
    });

    it('should handle empty input', () => {
      expect(splitIntoSentences('')).toEqual([]);
    });

    it('should handle single sentence', () => {
      const sentences = splitIntoSentences('Just one sentence.');
      expect(sentences).toHaveLength(1);
    });
  });

  describe('estimateTokens', () => {
    it('should estimate tokens based on character count', () => {
      // Roughly 4 characters per token
      const text = 'This is a test'; // 14 chars
      const tokens = estimateTokens(text);

      expect(tokens).toBe(Math.ceil(14 / 4)); // 4
    });

    it('should handle empty string', () => {
      expect(estimateTokens('')).toBe(0);
    });

    it('should round up for fractional tokens', () => {
      const text = 'Hi'; // 2 chars = 0.5 tokens, rounds to 1
      expect(estimateTokens(text)).toBe(1);
    });
  });
});
