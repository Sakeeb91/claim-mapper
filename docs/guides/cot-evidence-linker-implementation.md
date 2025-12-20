# Chain-of-Thought Evidence Linker Implementation Guide

> **Purpose**: This document serves as both a continuation prompt for Claude Code sessions and a technical implementation guide for completing the CoT Evidence Linker architecture.

---

## Quick Start Prompt for Claude Code

Copy and paste this prompt to continue implementation in a new Claude Code session:

```
I'm continuing implementation of the Chain-of-Thought Evidence Linker for the Claim Mapper project.

Read the implementation guide at docs/guides/cot-evidence-linker-implementation.md to understand:
1. Current architecture state (~60% complete)
2. What's already implemented vs missing
3. The priority implementation phases

Before making ANY changes:
1. Run the test suite to establish baseline: `cd backend/api && npm test`
2. Check current git status
3. Review the "Pre-Implementation Checklist" section

Start with Priority 1 tasks. Create GitHub issues for tracking, then implement incrementally with atomic commits. Ensure all tests pass after each change.
```

---

## Current Architecture State

### Implementation Status Summary

| Component | Status | Location | Notes |
|-----------|--------|----------|-------|
| Claim Extraction | 70% | `backend/ml/services/claim_extractor.py` | Missing dedup, limited types |
| Premise Decomposition | 50% | `backend/ml/services/reasoning_engine.py` | Prompts exist, no auto-graph |
| Evidence Corpus | 35% | `backend/api/src/models/Evidence.ts` | **CRITICAL GAP**: No vector DB |
| Semantic Linking | 60% | `backend/ml/services/semantic_analyzer.py` | Missing reranking |
| Graph Visualization | 80% | `src/components/graph/KnowledgeGraph.tsx` | Missing coverage viz |
| Data Models | 85% | `backend/api/src/models/*.ts` | Well-designed |
| Reasoning API | 100% | `backend/api/src/routes/reasoning.ts` | Just implemented |

### Critical Missing Infrastructure

```
NEEDED                          CURRENT STATE
────────────────────────────    ────────────────────────────
Vector DB (Pinecone/Weaviate)   ❌ Not implemented
Graph DB (Neo4j)                ❌ Not implemented
Ingestion Pipeline              ❌ Manual add only
Embedding Persistence           ❌ In-memory only
Cross-document Linking          ❌ Same-doc only
Reranking Pipeline              ❌ Fixed thresholds
Coverage Visualization          ❌ Not implemented
```

---

## Pre-Implementation Checklist

**CRITICAL: Run these before ANY implementation work**

```bash
# 1. Verify test baseline
cd /Users/sakeeb/Code\ repositories/claim-mapper
cd backend/api && npm test
cd ../ml && pytest tests/unit/ -v

# 2. Check current state
git status
git log --oneline -5

# 3. Verify services can start
cd backend/api && npm run build  # Should succeed
cd ../ml && python -c "from main import app; print('ML OK')"

# 4. Document baseline metrics
npm run test:coverage 2>/dev/null || echo "Coverage not configured"
```

**Record baseline test counts:**
- Backend API tests: _____ passing
- ML unit tests: _____ passing
- Frontend tests: _____ passing

---

## Priority 1: Vector Database & Ingestion Pipeline (Weeks 1-2)

### Goal
Enable persistent semantic search across evidence corpus with document ingestion.

### Task 1.1: Add Pinecone/Weaviate Integration

**Files to Create:**
```
backend/api/src/config/vectordb.ts       # Vector DB connection
backend/api/src/services/embedding.ts    # Embedding generation service
backend/api/src/services/vectorStore.ts  # CRUD operations for vectors
```

**Implementation Steps:**

1. **Choose Vector DB** (recommend Pinecone for managed, Weaviate for self-hosted)

2. **Create vectordb config:**
```typescript
// backend/api/src/config/vectordb.ts
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

export const evidenceIndex = pinecone.index(process.env.PINECONE_INDEX_NAME || 'evidence-claims');

export default pinecone;
```

3. **Create embedding service:**
```typescript
// backend/api/src/services/embedding.ts
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
    dimensions: 1536,
  });
  return response.data[0].embedding;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: texts,
    dimensions: 1536,
  });
  return response.data.map(d => d.embedding);
}
```

4. **Create vector store service:**
```typescript
// backend/api/src/services/vectorStore.ts
import { evidenceIndex } from '../config/vectordb';
import { generateEmbedding } from './embedding';

export interface VectorRecord {
  id: string;
  embedding: number[];
  metadata: {
    text: string;
    claimType: string;
    sourceUrl?: string;
    sourceType?: string;
    projectId: string;
    createdAt: string;
  };
}

export async function upsertEvidence(
  id: string,
  text: string,
  metadata: Omit<VectorRecord['metadata'], 'text'>
): Promise<void> {
  const embedding = await generateEmbedding(text);

  await evidenceIndex.upsert([{
    id,
    values: embedding,
    metadata: { text, ...metadata },
  }]);
}

export async function searchSimilar(
  query: string,
  topK: number = 10,
  filter?: Record<string, any>
): Promise<Array<{ id: string; score: number; metadata: VectorRecord['metadata'] }>> {
  const queryEmbedding = await generateEmbedding(query);

  const results = await evidenceIndex.query({
    vector: queryEmbedding,
    topK,
    filter,
    includeMetadata: true,
  });

  return results.matches?.map(m => ({
    id: m.id,
    score: m.score || 0,
    metadata: m.metadata as VectorRecord['metadata'],
  })) || [];
}

export async function deleteEvidence(id: string): Promise<void> {
  await evidenceIndex.deleteOne(id);
}
```

5. **Update Evidence model to sync with vector DB:**
```typescript
// Add to backend/api/src/models/Evidence.ts - post-save hook

EvidenceSchema.post('save', async function(doc) {
  try {
    const { upsertEvidence } = await import('../services/vectorStore');
    await upsertEvidence(
      doc._id.toString(),
      doc.text,
      {
        claimType: doc.type,
        sourceUrl: doc.source?.url,
        sourceType: doc.source?.type,
        projectId: doc.project.toString(),
        createdAt: doc.createdAt.toISOString(),
      }
    );
  } catch (error) {
    console.error('Failed to sync evidence to vector DB:', error);
    // Don't throw - allow MongoDB save to succeed
  }
});

EvidenceSchema.post('remove', async function(doc) {
  try {
    const { deleteEvidence } = await import('../services/vectorStore');
    await deleteEvidence(doc._id.toString());
  } catch (error) {
    console.error('Failed to remove evidence from vector DB:', error);
  }
});
```

**Environment Variables to Add:**
```bash
# Add to .env.example and docker-compose.dev.yml
PINECONE_API_KEY=your-api-key
PINECONE_INDEX_NAME=evidence-claims
OPENAI_API_KEY=your-openai-key  # For embeddings
```

**Tests to Create:**
```typescript
// backend/api/src/services/__tests__/vectorStore.test.ts
describe('Vector Store', () => {
  it('should upsert and retrieve evidence');
  it('should search by similarity');
  it('should filter by project');
  it('should handle deletion');
});
```

---

### Task 1.2: Document Ingestion Pipeline

**Files to Create:**
```
backend/api/src/services/ingestion/
  ├── index.ts           # Main ingestion orchestrator
  ├── parsers/
  │   ├── pdf.ts         # PDF parsing
  │   ├── html.ts        # HTML/webpage parsing
  │   └── text.ts        # Plain text parsing
  ├── chunker.ts         # Text chunking strategies
  └── extractor.ts       # Claim extraction from chunks
```

**Implementation Steps:**

1. **Create text chunker:**
```typescript
// backend/api/src/services/ingestion/chunker.ts
export interface Chunk {
  text: string;
  startIndex: number;
  endIndex: number;
  metadata: {
    section?: string;
    pageNumber?: number;
  };
}

export function chunkText(
  text: string,
  options: {
    maxChunkSize?: number;
    overlapSize?: number;
    splitOn?: 'sentence' | 'paragraph';
  } = {}
): Chunk[] {
  const { maxChunkSize = 1000, overlapSize = 100, splitOn = 'paragraph' } = options;

  const splitRegex = splitOn === 'paragraph' ? /\n\n+/ : /(?<=[.!?])\s+/;
  const segments = text.split(splitRegex);

  const chunks: Chunk[] = [];
  let currentChunk = '';
  let startIndex = 0;

  for (const segment of segments) {
    if (currentChunk.length + segment.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        startIndex,
        endIndex: startIndex + currentChunk.length,
        metadata: {},
      });

      // Overlap: keep last portion
      const overlapText = currentChunk.slice(-overlapSize);
      startIndex += currentChunk.length - overlapSize;
      currentChunk = overlapText + segment;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + segment;
    }
  }

  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk.trim(),
      startIndex,
      endIndex: startIndex + currentChunk.length,
      metadata: {},
    });
  }

  return chunks;
}
```

2. **Create ingestion orchestrator:**
```typescript
// backend/api/src/services/ingestion/index.ts
import { chunkText, Chunk } from './chunker';
import { upsertEvidence } from '../vectorStore';
import Evidence from '../../models/Evidence';
import axios from 'axios';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8002';

export interface IngestionResult {
  artifactId: string;
  chunksProcessed: number;
  claimsExtracted: number;
  evidenceCreated: string[];
  errors: string[];
}

export async function ingestDocument(
  text: string,
  source: {
    url?: string;
    title: string;
    type: 'document' | 'url' | 'text';
    author?: string;
    publishedDate?: Date;
  },
  projectId: string,
  userId: string
): Promise<IngestionResult> {
  const result: IngestionResult = {
    artifactId: `artifact_${Date.now()}`,
    chunksProcessed: 0,
    claimsExtracted: 0,
    evidenceCreated: [],
    errors: [],
  };

  try {
    // 1. Chunk the document
    const chunks = chunkText(text, { maxChunkSize: 1500 });
    result.chunksProcessed = chunks.length;

    // 2. Extract claims from each chunk via ML service
    for (const chunk of chunks) {
      try {
        const response = await axios.post(`${ML_SERVICE_URL}/extract-claims`, {
          text: chunk.text,
          extract_evidence: true,
        });

        const claims = response.data.claims || [];
        result.claimsExtracted += claims.length;

        // 3. Create Evidence documents for each claim
        for (const claim of claims) {
          const evidence = await Evidence.create({
            text: claim.text,
            type: mapClaimTypeToEvidenceType(claim.type),
            source: {
              url: source.url,
              title: source.title,
              type: source.type,
              author: source.author,
              publishedDate: source.publishedDate,
            },
            project: projectId,
            creator: userId,
            metadata: {
              extractedFrom: result.artifactId,
              chunkIndex: chunks.indexOf(chunk),
              originalSpan: claim.original_span,
              confidence: claim.confidence,
            },
          });

          result.evidenceCreated.push(evidence._id.toString());
        }
      } catch (chunkError) {
        result.errors.push(`Chunk ${chunks.indexOf(chunk)}: ${chunkError.message}`);
      }
    }
  } catch (error) {
    result.errors.push(`Ingestion failed: ${error.message}`);
  }

  return result;
}

function mapClaimTypeToEvidenceType(claimType: string): string {
  const mapping: Record<string, string> = {
    'ASSERTION': 'documented',
    'HYPOTHESIS': 'testimonial',
    'QUESTION': 'anecdotal',
    'factual': 'empirical',
    'causal': 'empirical',
    'statistical': 'statistical',
  };
  return mapping[claimType] || 'documented';
}
```

3. **Create ingestion API endpoint:**
```typescript
// Add to backend/api/src/routes/evidence.ts

/**
 * POST /api/evidence/ingest - Ingest a document and extract evidence
 */
router.post('/ingest',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { text, source, projectId } = req.body;

    // Validate project access
    const hasAccess = await checkProjectAccess(projectId, req.user!._id.toString());
    if (!hasAccess) {
      throw createError('Access denied', 403, 'ACCESS_DENIED');
    }

    const result = await ingestDocument(
      text,
      source,
      projectId,
      req.user!._id.toString()
    );

    res.status(201).json({
      success: true,
      message: `Ingested ${result.claimsExtracted} claims from ${result.chunksProcessed} chunks`,
      data: result,
    });
  })
);
```

---

### Task 1.3: Sync Existing Evidence to Vector DB

**Create migration script:**
```typescript
// backend/api/scripts/sync-vector-db.ts
import mongoose from 'mongoose';
import Evidence from '../src/models/Evidence';
import { upsertEvidence } from '../src/services/vectorStore';

async function syncAllEvidence() {
  await mongoose.connect(process.env.MONGODB_URI!);

  const cursor = Evidence.find({ isActive: true }).cursor();

  let count = 0;
  let errors = 0;

  for await (const doc of cursor) {
    try {
      await upsertEvidence(
        doc._id.toString(),
        doc.text,
        {
          claimType: doc.type,
          sourceUrl: doc.source?.url,
          sourceType: doc.source?.type,
          projectId: doc.project.toString(),
          createdAt: doc.createdAt.toISOString(),
        }
      );
      count++;
      if (count % 100 === 0) console.log(`Synced ${count} documents`);
    } catch (error) {
      console.error(`Failed to sync ${doc._id}:`, error);
      errors++;
    }
  }

  console.log(`\nSync complete: ${count} success, ${errors} errors`);
  process.exit(0);
}

syncAllEvidence();
```

**Add npm script:**
```json
// package.json
{
  "scripts": {
    "sync:vectordb": "ts-node scripts/sync-vector-db.ts"
  }
}
```

---

## Priority 2: Complete Semantic Linking (Weeks 3-4)

### Goal
Implement premise-to-evidence matching with reranking and deduplication.

### Task 2.1: Premise-Evidence Matching

**Files to Create:**
```
backend/api/src/services/linking/
  ├── index.ts           # Main linking orchestrator
  ├── matcher.ts         # Semantic matching logic
  ├── reranker.ts        # Cohere/cross-encoder reranking
  └── classifier.ts      # Relationship classification
```

**Implementation:**

```typescript
// backend/api/src/services/linking/matcher.ts
import { searchSimilar } from '../vectorStore';
import { rerank } from './reranker';
import { classifyRelationship } from './classifier';

export interface LinkedEvidence {
  evidenceId: string;
  evidenceText: string;
  relationship: 'supports' | 'refutes' | 'partial_support' | 'partial_refute' | 'neutral';
  confidence: number;
  sourceUrl?: string;
}

export async function linkPremiseToEvidence(
  premise: string,
  projectId: string,
  options: {
    topK?: number;
    rerankK?: number;
    minScore?: number;
  } = {}
): Promise<LinkedEvidence[]> {
  const { topK = 20, rerankK = 5, minScore = 0.5 } = options;

  // 1. Vector search for candidates
  const candidates = await searchSimilar(premise, topK, { projectId });

  if (candidates.length === 0) {
    return [];
  }

  // 2. Rerank with cross-encoder
  const reranked = await rerank(
    premise,
    candidates.map(c => c.metadata.text),
    rerankK
  );

  // 3. Classify relationships
  const linked: LinkedEvidence[] = [];

  for (const match of reranked) {
    if (match.score < minScore) continue;

    const candidate = candidates.find(c => c.metadata.text === match.text);
    if (!candidate) continue;

    const relationship = await classifyRelationship(premise, match.text);

    linked.push({
      evidenceId: candidate.id,
      evidenceText: match.text,
      relationship,
      confidence: match.score,
      sourceUrl: candidate.metadata.sourceUrl,
    });
  }

  return linked;
}
```

```typescript
// backend/api/src/services/linking/reranker.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export interface RerankResult {
  text: string;
  score: number;
  index: number;
}

export async function rerank(
  query: string,
  documents: string[],
  topK: number
): Promise<RerankResult[]> {
  // Use Claude for reranking (or Cohere API if available)
  const prompt = `Given the query and documents below, rank the documents by relevance to the query.
Return a JSON array of indices in order of relevance, with relevance scores (0-1).

Query: "${query}"

Documents:
${documents.map((d, i) => `[${i}] ${d}`).join('\n')}

Return format: [{"index": 0, "score": 0.95}, ...]
Only include the top ${topK} most relevant.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });

  const rankings = JSON.parse(response.content[0].text);

  return rankings.map((r: { index: number; score: number }) => ({
    text: documents[r.index],
    score: r.score,
    index: r.index,
  }));
}
```

```typescript
// backend/api/src/services/linking/classifier.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export type Relationship = 'supports' | 'refutes' | 'partial_support' | 'partial_refute' | 'neutral';

export async function classifyRelationship(
  premise: string,
  evidence: string
): Promise<Relationship> {
  const prompt = `Classify the relationship between the premise and evidence.

Premise: "${premise}"
Evidence: "${evidence}"

Categories:
- SUPPORTS: Evidence directly supports the premise
- REFUTES: Evidence contradicts the premise
- PARTIAL_SUPPORT: Evidence somewhat supports but with caveats
- PARTIAL_REFUTE: Evidence somewhat contradicts but with caveats
- NEUTRAL: Evidence is related but doesn't affect truth value

Return ONLY one of: SUPPORTS, REFUTES, PARTIAL_SUPPORT, PARTIAL_REFUTE, NEUTRAL`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 50,
    messages: [{ role: 'user', content: prompt }],
  });

  const result = response.content[0].text.trim().toLowerCase();

  const mapping: Record<string, Relationship> = {
    'supports': 'supports',
    'refutes': 'refutes',
    'partial_support': 'partial_support',
    'partial_refute': 'partial_refute',
    'neutral': 'neutral',
  };

  return mapping[result] || 'neutral';
}
```

### Task 2.2: Deduplication System

```typescript
// backend/api/src/services/deduplication.ts
import { generateEmbedding } from './embedding';
import { searchSimilar } from './vectorStore';

export interface DuplicateCheck {
  isDuplicate: boolean;
  duplicateOf?: string;
  similarity?: number;
}

export async function checkDuplicate(
  text: string,
  projectId: string,
  threshold: number = 0.92
): Promise<DuplicateCheck> {
  const similar = await searchSimilar(text, 1, { projectId });

  if (similar.length === 0) {
    return { isDuplicate: false };
  }

  const topMatch = similar[0];

  if (topMatch.score >= threshold) {
    return {
      isDuplicate: true,
      duplicateOf: topMatch.id,
      similarity: topMatch.score,
    };
  }

  return { isDuplicate: false };
}

export async function findDuplicateClusters(
  projectId: string,
  threshold: number = 0.90
): Promise<string[][]> {
  // Implementation for batch duplicate detection
  // Returns clusters of duplicate document IDs
  // Use for corpus cleanup
}
```

### Task 2.3: Update Reasoning API to Use Linking

```typescript
// Update backend/api/src/routes/reasoning.ts - POST /generate

// After generating reasoning chain, auto-link evidence:
import { linkPremiseToEvidence } from '../services/linking';

// Inside the generate handler, after creating reasoning chain:
for (const step of reasoningChain.steps) {
  if (step.type === 'premise') {
    const linkedEvidence = await linkPremiseToEvidence(
      step.text,
      project._id.toString(),
      { rerankK: 3 }
    );

    // Update step with evidence references
    step.evidence = linkedEvidence
      .filter(e => e.relationship === 'supports')
      .map(e => new mongoose.Types.ObjectId(e.evidenceId));

    step.metadata = {
      ...step.metadata,
      linkedEvidence: linkedEvidence,
    };
  }
}

await reasoningChain.save();
```

---

## Priority 3: Enhance Visualization (Weeks 5-6)

### Goal
Add coverage visualization and evidence drawer.

### Task 3.1: Coverage Visualization

**Files to Modify:**
```
src/components/graph/KnowledgeGraph.tsx    # Add coverage coloring
src/components/graph/CoverageHeatmap.tsx   # New component
src/components/graph/EvidenceDrawer.tsx    # New component
```

**Implementation:**

```typescript
// src/components/graph/CoverageHeatmap.tsx
import React from 'react';

interface CoverageData {
  premiseId: string;
  premiseText: string;
  supportCount: number;
  refuteCount: number;
  hasEvidence: boolean;
  netSupport: number;
}

interface CoverageHeatmapProps {
  coverage: CoverageData[];
  onPremiseClick: (premiseId: string) => void;
}

export const CoverageHeatmap: React.FC<CoverageHeatmapProps> = ({
  coverage,
  onPremiseClick,
}) => {
  const getColor = (data: CoverageData): string => {
    if (!data.hasEvidence) return '#9CA3AF'; // Gray - no evidence
    if (data.netSupport > 0) return '#10B981'; // Green - supported
    if (data.netSupport < 0) return '#EF4444'; // Red - contested
    return '#F59E0B'; // Yellow - mixed
  };

  return (
    <div className="coverage-heatmap p-4">
      <h3 className="text-lg font-semibold mb-3">Evidence Coverage</h3>
      <div className="grid gap-2">
        {coverage.map((item) => (
          <div
            key={item.premiseId}
            className="flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-gray-100"
            onClick={() => onPremiseClick(item.premiseId)}
          >
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: getColor(item) }}
            />
            <span className="text-sm flex-1 truncate">{item.premiseText}</span>
            <span className="text-xs text-gray-500">
              +{item.supportCount} / -{item.refuteCount}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Supported</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Contested</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>Mixed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-gray-400" />
          <span>No Evidence</span>
        </div>
      </div>
    </div>
  );
};
```

```typescript
// src/components/graph/EvidenceDrawer.tsx
import React from 'react';

interface Evidence {
  id: string;
  text: string;
  relationship: 'supports' | 'refutes' | 'neutral';
  confidence: number;
  sourceUrl?: string;
  sourceTitle?: string;
}

interface EvidenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  premiseText: string;
  evidence: Evidence[];
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  isOpen,
  onClose,
  premiseText,
  evidence,
}) => {
  if (!isOpen) return null;

  const supporting = evidence.filter(e => e.relationship === 'supports');
  const refuting = evidence.filter(e => e.relationship === 'refutes');

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 overflow-y-auto">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Evidence</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2 italic">"{premiseText}"</p>
      </div>

      {supporting.length > 0 && (
        <div className="p-4 border-b">
          <h4 className="text-green-600 font-medium mb-2">
            Supporting Evidence ({supporting.length})
          </h4>
          {supporting.map(e => (
            <EvidenceCard key={e.id} evidence={e} />
          ))}
        </div>
      )}

      {refuting.length > 0 && (
        <div className="p-4 border-b">
          <h4 className="text-red-600 font-medium mb-2">
            Refuting Evidence ({refuting.length})
          </h4>
          {refuting.map(e => (
            <EvidenceCard key={e.id} evidence={e} />
          ))}
        </div>
      )}

      {evidence.length === 0 && (
        <div className="p-4 text-center text-gray-500">
          No evidence found for this premise
        </div>
      )}
    </div>
  );
};

const EvidenceCard: React.FC<{ evidence: Evidence }> = ({ evidence }) => (
  <div className="bg-gray-50 rounded p-3 mb-2">
    <p className="text-sm">{evidence.text}</p>
    <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
      <span>Confidence: {(evidence.confidence * 100).toFixed(0)}%</span>
      {evidence.sourceUrl && (
        <a href={evidence.sourceUrl} target="_blank" className="text-blue-500 hover:underline">
          Source →
        </a>
      )}
    </div>
  </div>
);
```

---

## Testing Strategy

### Unit Tests to Add

```bash
# Priority 1 tests
backend/api/src/services/__tests__/vectorStore.test.ts
backend/api/src/services/__tests__/embedding.test.ts
backend/api/src/services/ingestion/__tests__/chunker.test.ts
backend/api/src/services/ingestion/__tests__/index.test.ts

# Priority 2 tests
backend/api/src/services/linking/__tests__/matcher.test.ts
backend/api/src/services/linking/__tests__/reranker.test.ts
backend/api/src/services/linking/__tests__/classifier.test.ts
backend/api/src/services/__tests__/deduplication.test.ts

# Priority 3 tests
src/components/graph/__tests__/CoverageHeatmap.test.tsx
src/components/graph/__tests__/EvidenceDrawer.test.tsx
```

### Integration Tests

```typescript
// backend/api/src/__tests__/integration/ingestion.test.ts
describe('Document Ingestion Pipeline', () => {
  it('should ingest document, extract claims, and store in vector DB');
  it('should handle large documents with chunking');
  it('should detect and skip duplicates');
});

// backend/api/src/__tests__/integration/linking.test.ts
describe('Premise-Evidence Linking', () => {
  it('should find relevant evidence for premise');
  it('should correctly classify support/refute relationships');
  it('should auto-link when generating reasoning chains');
});
```

---

## Commit Strategy

Use atomic commits following these patterns:

```bash
# Priority 1
feat(vectordb): add Pinecone configuration and connection
feat(embedding): implement OpenAI embedding generation service
feat(vectorstore): implement vector CRUD operations
feat(evidence): add post-save hook for vector sync
feat(ingestion): implement text chunking service
feat(ingestion): implement document ingestion orchestrator
feat(evidence): add POST /ingest endpoint
chore(scripts): add vector DB sync migration script

# Priority 2
feat(linking): implement premise-evidence matcher
feat(linking): implement cross-encoder reranking
feat(linking): implement relationship classifier
feat(dedup): implement duplicate detection service
feat(reasoning): auto-link evidence on chain generation

# Priority 3
feat(graph): add CoverageHeatmap component
feat(graph): add EvidenceDrawer component
feat(graph): integrate coverage visualization into KnowledgeGraph
```

---

## Environment Setup

Add these to your environment:

```bash
# .env.local
PINECONE_API_KEY=pk-xxx
PINECONE_INDEX_NAME=claim-mapper-evidence
OPENAI_API_KEY=sk-xxx  # For embeddings
ANTHROPIC_API_KEY=sk-ant-xxx  # For reranking/classification

# Optional: Cohere for better reranking
COHERE_API_KEY=xxx
```

---

## Rollback Plan

If issues arise:

1. **Vector DB issues**:
   - Disable post-save hook by commenting out in Evidence.ts
   - Application continues with MongoDB-only storage

2. **Ingestion failures**:
   - Ingestion is async and non-blocking
   - Failed chunks logged but don't break pipeline

3. **Linking failures**:
   - Auto-linking is optional enhancement
   - Reasoning chains still work without evidence links

---

## Success Metrics

After implementation, verify:

- [ ] `npm test` passes with no regressions
- [ ] Vector DB syncs on evidence creation
- [ ] `/evidence/ingest` extracts claims from documents
- [ ] `/reasoning/generate` auto-links evidence to premises
- [ ] Coverage heatmap shows evidence status
- [ ] Evidence drawer shows supporting/refuting evidence

---

## Contact / Resume

If you need to resume this work in a new session, use the quick start prompt at the top of this document. The implementation is designed to be incremental - each priority can be completed independently.
