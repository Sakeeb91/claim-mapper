/**
 * Relationship Classifier Service
 *
 * Classifies the semantic relationship between a premise and evidence
 * using LLM-based natural language inference (NLI).
 *
 * @module services/linking/classifier
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { logger } from '../../utils/logger';

/**
 * Possible relationships between a premise and evidence
 */
export type Relationship =
  | 'supports'
  | 'refutes'
  | 'partial_support'
  | 'partial_refute'
  | 'neutral';

/**
 * Classification result with confidence
 */
export interface ClassificationResult {
  relationship: Relationship;
  confidence: number;
  reasoning?: string;
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
 * Classification prompt template
 */
const CLASSIFICATION_PROMPT = `Analyze the relationship between the given premise and evidence.

PREMISE: "{premise}"

EVIDENCE: "{evidence}"

Classify the relationship as one of:
- SUPPORTS: Evidence directly supports or confirms the premise
- REFUTES: Evidence directly contradicts or disproves the premise
- PARTIAL_SUPPORT: Evidence somewhat supports the premise but with limitations or caveats
- PARTIAL_REFUTE: Evidence somewhat contradicts the premise but not completely
- NEUTRAL: Evidence is related but neither supports nor refutes the premise

Respond with a JSON object in this exact format:
{
  "relationship": "SUPPORTS" | "REFUTES" | "PARTIAL_SUPPORT" | "PARTIAL_REFUTE" | "NEUTRAL",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation"
}

Consider:
1. Direct logical entailment or contradiction
2. Factual consistency or inconsistency
3. Strength of the evidential connection
4. Presence of qualifying language or exceptions

Return ONLY the JSON object, no additional text.`;

/**
 * Classify the relationship between a premise and evidence using Anthropic
 */
async function classifyWithAnthropic(
  premise: string,
  evidence: string
): Promise<ClassificationResult> {
  const client = getAnthropicClient();
  const prompt = CLASSIFICATION_PROMPT.replace('{premise}', premise).replace(
    '{evidence}',
    evidence
  );

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Anthropic');
  }

  return parseClassificationResponse(content.text);
}

/**
 * Classify the relationship between a premise and evidence using OpenAI
 */
async function classifyWithOpenAI(
  premise: string,
  evidence: string
): Promise<ClassificationResult> {
  const client = getOpenAIClient();
  const prompt = CLASSIFICATION_PROMPT.replace('{premise}', premise).replace(
    '{evidence}',
    evidence
  );

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  return parseClassificationResponse(content);
}

/**
 * Parse the LLM response into a ClassificationResult
 */
function parseClassificationResponse(response: string): ClassificationResult {
  try {
    // Extract JSON from potential markdown code blocks
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const relationshipMap: Record<string, Relationship> = {
      supports: 'supports',
      refutes: 'refutes',
      partial_support: 'partial_support',
      partial_refute: 'partial_refute',
      neutral: 'neutral',
    };

    const normalizedRelationship = (parsed.relationship || '')
      .toLowerCase()
      .replace(/\s+/g, '_');
    const relationship = relationshipMap[normalizedRelationship] || 'neutral';

    return {
      relationship,
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
      reasoning: parsed.reasoning,
    };
  } catch (error) {
    logger.warn('Failed to parse classification response, defaulting to neutral', {
      response,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return {
      relationship: 'neutral',
      confidence: 0.3,
      reasoning: 'Failed to parse response',
    };
  }
}

/**
 * Classify the relationship between a premise and evidence
 *
 * @param premise - The premise statement from a reasoning chain
 * @param evidence - The evidence text to evaluate
 * @param provider - LLM provider to use (default: anthropic)
 * @returns Classification result with relationship type and confidence
 */
export async function classifyRelationship(
  premise: string,
  evidence: string,
  provider: LLMProvider = 'anthropic'
): Promise<ClassificationResult> {
  if (!premise || !evidence) {
    return {
      relationship: 'neutral',
      confidence: 0,
      reasoning: 'Empty premise or evidence',
    };
  }

  try {
    const result =
      provider === 'anthropic'
        ? await classifyWithAnthropic(premise, evidence)
        : await classifyWithOpenAI(premise, evidence);

    logger.debug('Relationship classified', {
      premiseLength: premise.length,
      evidenceLength: evidence.length,
      relationship: result.relationship,
      confidence: result.confidence,
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Relationship classification failed', { error: errorMessage });

    // Return neutral with low confidence on error
    return {
      relationship: 'neutral',
      confidence: 0.1,
      reasoning: `Classification failed: ${errorMessage}`,
    };
  }
}

/**
 * Batch classify multiple premise-evidence pairs
 *
 * @param pairs - Array of premise-evidence pairs to classify
 * @param provider - LLM provider to use
 * @returns Array of classification results in the same order
 */
export async function classifyRelationshipsBatch(
  pairs: Array<{ premise: string; evidence: string }>,
  provider: LLMProvider = 'anthropic'
): Promise<ClassificationResult[]> {
  // Process in parallel with concurrency limit
  const results: ClassificationResult[] = [];
  const batchSize = 5;

  for (let i = 0; i < pairs.length; i += batchSize) {
    const batch = pairs.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((pair) => classifyRelationship(pair.premise, pair.evidence, provider))
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Check if classification service is available
 */
export function isClassifierEnabled(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
}

export default {
  classifyRelationship,
  classifyRelationshipsBatch,
  isClassifierEnabled,
};
