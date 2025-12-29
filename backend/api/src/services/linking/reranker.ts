/**
 * Cross-Encoder Reranking Service
 *
 * Reranks candidate evidence using cross-encoder scoring for improved precision.
 * This provides a second-stage filtering after initial vector similarity search.
 *
 * @module services/linking/reranker
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { logger } from '../../utils/logger';

/**
 * Result from reranking operation
 */
export interface RerankResult {
  text: string;
  score: number;
  originalIndex: number;
}

/**
 * LLM provider options
 */
export type LLMProvider = 'anthropic' | 'openai';

// LLM client singletons
let anthropicClient: Anthropic | null = null;
let openaiClient: OpenAI | null = null;

/**
 * Get or initialize the Anthropic client
 */
function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

/**
 * Get or initialize the OpenAI client
 */
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * Reranking prompt template
 */
const RERANK_PROMPT = `You are a relevance scoring system. Given a query and a list of documents, score each document's relevance to the query.

QUERY: "{query}"

DOCUMENTS:
{documents}

For each document, provide a relevance score from 0.0 to 1.0 where:
- 1.0 = Highly relevant, directly addresses the query
- 0.7-0.9 = Very relevant, contains important related information
- 0.4-0.6 = Somewhat relevant, tangentially related
- 0.1-0.3 = Marginally relevant, only loosely connected
- 0.0 = Not relevant at all

Consider:
1. Semantic similarity to the query
2. Information overlap and coverage
3. Specificity and directness of the connection
4. Quality and informativeness of the document

Return a JSON array of objects in this exact format, sorted by score descending:
[
  {"index": 0, "score": 0.95},
  {"index": 2, "score": 0.82},
  ...
]

Return ONLY the JSON array, no additional text.`;

/**
 * Format documents for the prompt
 */
function formatDocuments(documents: string[]): string {
  return documents.map((doc, i) => `[${i}] ${doc.substring(0, 500)}`).join('\n\n');
}

/**
 * Rerank documents using Anthropic
 */
async function rerankWithAnthropic(
  query: string,
  documents: string[],
  topK: number
): Promise<RerankResult[]> {
  const client = getAnthropicClient();
  const prompt = RERANK_PROMPT.replace('{query}', query).replace(
    '{documents}',
    formatDocuments(documents)
  );

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Anthropic');
  }

  return parseRerankResponse(content.text, documents, topK);
}

/**
 * Rerank documents using OpenAI
 */
async function rerankWithOpenAI(
  query: string,
  documents: string[],
  topK: number
): Promise<RerankResult[]> {
  const client = getOpenAIClient();
  const prompt = RERANK_PROMPT.replace('{query}', query).replace(
    '{documents}',
    formatDocuments(documents)
  );

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  // OpenAI with JSON mode may wrap in an object
  let responseText = content;
  try {
    const parsed = JSON.parse(content);
    if (parsed.rankings) {
      responseText = JSON.stringify(parsed.rankings);
    } else if (Array.isArray(parsed)) {
      responseText = content;
    }
  } catch {
    // Keep original if not valid JSON
  }

  return parseRerankResponse(responseText, documents, topK);
}

/**
 * Parse the LLM reranking response
 */
function parseRerankResponse(
  response: string,
  documents: string[],
  topK: number
): RerankResult[] {
  try {
    // Extract JSON array from potential markdown code blocks
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as Array<{ index: number; score: number }>;

    // Validate and filter results
    const results: RerankResult[] = [];
    for (const item of parsed) {
      if (
        typeof item.index === 'number' &&
        item.index >= 0 &&
        item.index < documents.length &&
        typeof item.score === 'number'
      ) {
        results.push({
          text: documents[item.index],
          score: Math.min(1, Math.max(0, item.score)),
          originalIndex: item.index,
        });
      }
    }

    // Sort by score descending and take top K
    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  } catch (error) {
    logger.warn('Failed to parse reranking response, returning original order', {
      response,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Fallback: return documents in original order with default scores
    return documents.slice(0, topK).map((text, i) => ({
      text,
      score: 1 - i * 0.1,
      originalIndex: i,
    }));
  }
}

/**
 * Rerank candidate documents by relevance to a query
 *
 * @param query - The query/premise to rank against
 * @param documents - Array of candidate documents to rerank
 * @param topK - Number of top results to return
 * @param provider - LLM provider to use (default: anthropic)
 * @returns Array of reranked results sorted by relevance
 */
export async function rerank(
  query: string,
  documents: string[],
  topK: number = 5,
  provider: LLMProvider = 'anthropic'
): Promise<RerankResult[]> {
  if (!query || documents.length === 0) {
    return [];
  }

  // If fewer documents than requested, return all
  if (documents.length <= topK) {
    return documents.map((text, i) => ({
      text,
      score: 1 - i * 0.1,
      originalIndex: i,
    }));
  }

  try {
    const results =
      provider === 'anthropic'
        ? await rerankWithAnthropic(query, documents, topK)
        : await rerankWithOpenAI(query, documents, topK);

    logger.debug('Documents reranked', {
      queryLength: query.length,
      documentCount: documents.length,
      topK,
      resultsCount: results.length,
    });

    return results;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Reranking failed, falling back to original order', { error: errorMessage });

    // Fallback: return documents in original order
    return documents.slice(0, topK).map((text, i) => ({
      text,
      score: 1 - i * 0.1,
      originalIndex: i,
    }));
  }
}

/**
 * Check if reranking service is available
 */
export function isRerankerEnabled(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
}

export default {
  rerank,
  isRerankerEnabled,
};
