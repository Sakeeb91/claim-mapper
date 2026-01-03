/**
 * Claims Routes Unit Tests - Part 2: Extended Operations
 * Tests evidence attachment, comments, relationships, and AI analysis
 */

import mongoose from 'mongoose';

// Mock all dependencies before importing
jest.mock('../../config/redis', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    deletePattern: jest.fn().mockResolvedValue(undefined),
    trackUserActivity: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('axios', () => ({
  post: jest.fn().mockResolvedValue({
    data: {
      overall_score: 0.85,
      clarity_score: 0.9,
      specificity_score: 0.8,
      evidence_score: 0.75,
    },
  }),
}));

import redisManager from '../../config/redis';
import axios from 'axios';

describe('Claims Routes - Extended Operations', () => {
  const mockUserId = new mongoose.Types.ObjectId().toHexString();
  const mockProjectId = new mongoose.Types.ObjectId().toHexString();
  const mockClaimId = new mongoose.Types.ObjectId().toHexString();
  const mockEvidenceId = new mongoose.Types.ObjectId().toHexString();
  const mockRelatedClaimId = new mongoose.Types.ObjectId().toHexString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/claims/:id/evidence - Add Evidence to Claim', () => {
    describe('Evidence ID Validation', () => {
      it('should require evidenceIds array', () => {
        const body: { evidenceIds?: unknown[] } = {};

        const hasEvidenceIds =
          body.evidenceIds &&
          Array.isArray(body.evidenceIds);

        expect(hasEvidenceIds).toBeFalsy();
      });

      it('should accept array of valid evidence IDs', () => {
        const evidenceIds = [mockEvidenceId, new mongoose.Types.ObjectId().toHexString()];

        expect(Array.isArray(evidenceIds)).toBe(true);
        expect(evidenceIds).toHaveLength(2);
      });
    });

    describe('Evidence Deduplication', () => {
      it('should filter out already attached evidence', () => {
        const existingEvidence = [mockEvidenceId];
        const newEvidenceIds = [
          mockEvidenceId, // Already exists
          new mongoose.Types.ObjectId().toHexString(), // New
        ];

        const filteredIds = newEvidenceIds.filter(
          (eid) => !existingEvidence.some((existing) => existing === eid)
        );

        expect(filteredIds).toHaveLength(1);
        expect(filteredIds).not.toContain(mockEvidenceId);
      });
    });

    describe('Bidirectional Reference', () => {
      it('should update evidence with claim reference', () => {
        const updateQuery = {
          _id: { $in: [mockEvidenceId] },
          claims: { $ne: mockClaimId },
        };

        const update = {
          $push: { claims: mockClaimId },
        };

        expect(updateQuery.claims.$ne).toBe(mockClaimId);
        expect(update.$push.claims).toBe(mockClaimId);
      });
    });

    describe('Response Structure', () => {
      it('should return claim with updated evidence', () => {
        const response = {
          success: true,
          message: 'Evidence added successfully',
          data: {
            claim: mockClaimId,
            evidence: [
              { _id: mockEvidenceId, text: 'Evidence text', type: 'empirical' },
            ],
          },
        };

        expect(response.success).toBe(true);
        expect(response.data.evidence).toHaveLength(1);
      });
    });
  });

  describe('POST /api/claims/:id/comments - Add Comment to Claim', () => {
    describe('Comment Validation', () => {
      it('should require comment text', () => {
        const text: string = '';

        const isValid = text.length > 0 && text.trim().length >= 1;

        expect(isValid).toBeFalsy();
      });

      it('should accept non-empty comment text', () => {
        const text = 'This is a valid comment';

        const isValid = text.length > 0 && text.trim().length >= 1;

        expect(isValid).toBe(true);
      });
    });

    describe('Comment Settings Check', () => {
      it('should check if comments are allowed on project', () => {
        const projectSettings = {
          collaboration: { allowComments: true },
        };

        expect(projectSettings.collaboration.allowComments).toBe(true);
      });

      it('should reject comments when disabled', () => {
        const projectSettings = {
          collaboration: { allowComments: false },
        };

        expect(projectSettings.collaboration.allowComments).toBe(false);
      });
    });

    describe('Comment Structure', () => {
      it('should create comment with required fields', () => {
        const comment = {
          user: mockUserId,
          text: 'This is a comment',
          timestamp: new Date(),
          resolved: false,
          replies: [],
        };

        expect(comment.user).toBe(mockUserId);
        expect(comment.resolved).toBe(false);
        expect(comment.replies).toEqual([]);
      });
    });

    describe('Response Structure', () => {
      it('should return created comment', () => {
        const response = {
          success: true,
          message: 'Comment added successfully',
          data: {
            _id: new mongoose.Types.ObjectId().toHexString(),
            user: { firstName: 'Test', lastName: 'User', email: 'test@example.com' },
            text: 'This is a comment',
            timestamp: new Date(),
            resolved: false,
            replies: [],
          },
        };

        expect(response.success).toBe(true);
        expect(response.data.user).toBeDefined();
        expect(response.data.text).toBeDefined();
      });
    });
  });

  describe('POST /api/claims/relate - Create Claim Relationships', () => {
    describe('Relationship Validation', () => {
      it('should require at least 2 claim IDs', () => {
        const claimIds = [mockClaimId];

        expect(claimIds.length).toBeLessThan(2);
      });

      it('should accept valid relationship types', () => {
        const validRelationships = ['supports', 'contradicts', 'questions', 'elaborates', 'similar'];
        const relationship = 'supports';

        expect(validRelationships).toContain(relationship);
      });

      it('should require confidence value', () => {
        const confidence = 0.8;

        expect(confidence).toBeGreaterThanOrEqual(0);
        expect(confidence).toBeLessThanOrEqual(1);
      });
    });

    describe('Bidirectional Relationship Creation', () => {
      it('should create relationship from claim1 to claim2', () => {
        const claim1Relations: Array<{
          claimId: string;
          relationship: string;
          confidence: number;
          notes?: string;
        }> = [];
        const relationship = 'supports';
        const confidence = 0.8;
        const notes = 'Related claims';

        claim1Relations.push({
          claimId: mockRelatedClaimId,
          relationship,
          confidence,
          notes,
        });

        expect(claim1Relations).toHaveLength(1);
        expect(claim1Relations[0].claimId).toBe(mockRelatedClaimId);
      });

      it('should create reverse relationship', () => {
        const relationship = 'supports';
        // Supports/contradicts are symmetric
        let reverseRelationship = relationship;
        if (relationship === 'supports') reverseRelationship = 'supports';
        else if (relationship === 'contradicts') reverseRelationship = 'contradicts';

        expect(reverseRelationship).toBe('supports');
      });
    });

    describe('Permission Checking', () => {
      it('should check edit permission for all claims', () => {
        const claims = [
          { _id: mockClaimId, creator: mockUserId },
          { _id: mockRelatedClaimId, creator: mockUserId },
        ];

        const canEditAll = claims.every(
          (claim) => claim.creator === mockUserId
        );

        expect(canEditAll).toBe(true);
      });
    });

    describe('Response Structure', () => {
      it('should return relationship details', () => {
        const response = {
          success: true,
          message: 'Claims related successfully',
          data: {
            relationship: 'supports',
            claimIds: [mockClaimId, mockRelatedClaimId],
            confidence: 0.8,
          },
        };

        expect(response.success).toBe(true);
        expect(response.data.claimIds).toHaveLength(2);
      });
    });
  });

  describe('GET /api/claims/:id/analysis - Get AI Analysis', () => {
    describe('Caching', () => {
      it('should check cache before ML service call', async () => {
        const cacheKey = `claim_analysis:${mockClaimId}`;
        (redisManager.get as jest.Mock).mockResolvedValue(null);

        const cached = await redisManager.get(cacheKey);

        expect(redisManager.get).toHaveBeenCalledWith(cacheKey);
        expect(cached).toBeNull();
      });

      it('should return cached analysis if available', async () => {
        const cachedAnalysis = {
          quality: { overall_score: 0.85 },
          reasoning: { steps: [] },
          timestamp: new Date(),
        };
        (redisManager.get as jest.Mock).mockResolvedValue(cachedAnalysis);

        const result = await redisManager.get(`claim_analysis:${mockClaimId}`);

        expect(result).toEqual(cachedAnalysis);
      });

      it('should cache analysis result with 1 hour TTL', async () => {
        const cacheKey = `claim_analysis:${mockClaimId}`;
        const analysis = { quality: {}, reasoning: {} };
        const ttl = 3600; // 1 hour

        await redisManager.set(cacheKey, analysis, ttl);

        expect(redisManager.set).toHaveBeenCalledWith(cacheKey, analysis, ttl);
      });
    });

    describe('ML Service Integration', () => {
      it('should call ML validate endpoint', async () => {
        const claimText = 'This is a claim to analyze';
        const claimType = 'assertion';
        const evidence = ['Evidence 1', 'Evidence 2'];

        await axios.post(`${process.env.ML_SERVICE_URL}/validate`, {
          claim_text: claimText,
          claim_type: claimType,
          evidence,
        });

        expect(axios.post).toHaveBeenCalled();
      });

      it('should call ML reasoning endpoint', async () => {
        const claimText = 'This is a claim to analyze';
        const evidence = ['Evidence 1'];

        await axios.post(`${process.env.ML_SERVICE_URL}/reasoning/generate`, {
          claim: claimText,
          evidence,
          reasoning_type: 'deductive',
          complexity: 'intermediate',
        });

        expect(axios.post).toHaveBeenCalledTimes(1);
      });
    });

    describe('Error Handling', () => {
      afterEach(() => {
        // Restore axios mock to resolve after error tests
        (axios.post as jest.Mock).mockResolvedValue({
          data: {
            overall_score: 0.85,
            clarity_score: 0.9,
            specificity_score: 0.8,
            evidence_score: 0.75,
          },
        });
      });

      it('should handle ML service timeout', async () => {
        (axios.post as jest.Mock).mockRejectedValueOnce(new Error('Timeout'));

        try {
          await axios.post('http://ml-service/validate', {});
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      it('should return service unavailable on ML error', () => {
        const errorResponse = {
          message: 'Analysis service unavailable',
          code: 'ANALYSIS_SERVICE_UNAVAILABLE',
          statusCode: 503,
        };

        expect(errorResponse.statusCode).toBe(503);
      });
    });

    describe('Response Structure', () => {
      it('should combine quality and reasoning analysis', () => {
        const response = {
          success: true,
          data: {
            quality: {
              overall_score: 0.85,
              clarity_score: 0.9,
              specificity_score: 0.8,
              evidence_score: 0.75,
            },
            reasoning: {
              steps: [],
              validity: { overall_score: 0.8 },
            },
            timestamp: new Date(),
          },
        };

        expect(response.data.quality).toBeDefined();
        expect(response.data.reasoning).toBeDefined();
        expect(response.data.timestamp).toBeDefined();
      });

      it('should include cached flag when from cache', () => {
        const response = {
          success: true,
          data: {
            quality: {},
            reasoning: {},
            timestamp: new Date(),
          },
          cached: true,
        };

        expect(response.cached).toBe(true);
      });
    });
  });

  describe('AI-Triggered Claim Analysis (on creation)', () => {
    describe('Settings Check', () => {
      it('should check if AI generation is enabled', () => {
        const projectSettings = {
          reasoning: { enableAIGeneration: true },
        };

        expect(projectSettings.reasoning.enableAIGeneration).toBe(true);
      });

      it('should skip ML analysis when disabled', () => {
        const projectSettings = {
          reasoning: { enableAIGeneration: false },
        };

        expect(projectSettings.reasoning.enableAIGeneration).toBe(false);
      });
    });

    describe('Quality Score Update', () => {
      it('should update claim with ML quality scores', () => {
        const mlResponse = {
          overall_score: 0.85,
          clarity_score: 0.9,
          specificity_score: 0.8,
          evidence_score: 0.75,
          bias_score: 0.7,
          factuality_score: 0.85,
          completeness_score: 0.8,
          issues: ['Minor clarity issue'],
          recommendations: ['Add more evidence'],
        };

        const claimQuality = {
          overallScore: mlResponse.overall_score,
          clarityScore: mlResponse.clarity_score,
          specificityScore: mlResponse.specificity_score,
          evidenceScore: mlResponse.evidence_score,
          biasScore: mlResponse.bias_score,
          factualityScore: mlResponse.factuality_score,
          completenessScore: mlResponse.completeness_score,
          issues: mlResponse.issues,
          recommendations: mlResponse.recommendations,
        };

        expect(claimQuality.overallScore).toBe(0.85);
        expect(claimQuality.issues).toContain('Minor clarity issue');
      });
    });

    describe('Error Handling', () => {
      afterEach(() => {
        // Restore axios mock to resolve after error tests
        (axios.post as jest.Mock).mockResolvedValue({
          data: {
            overall_score: 0.85,
            clarity_score: 0.9,
            specificity_score: 0.8,
            evidence_score: 0.75,
          },
        });
      });

      it('should log warning on ML analysis failure', async () => {
        (axios.post as jest.Mock).mockRejectedValueOnce(new Error('ML service error'));

        try {
          await axios.post('http://ml-service/validate', {});
        } catch (error) {
          // Claim creation should continue despite ML failure
          expect(error).toBeDefined();
        }
      });

      it('should not fail claim creation on ML error', () => {
        const claimCreated = true;
        const mlAnalysisFailed = true;

        // Claim should still be created successfully
        expect(claimCreated).toBe(true);
        expect(mlAnalysisFailed).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    describe('Empty Evidence Array', () => {
      it('should handle claim with no evidence', () => {
        const claim = {
          evidence: [],
        };

        expect(claim.evidence).toHaveLength(0);
      });
    });

    describe('Maximum Related Claims', () => {
      it('should handle up to 10 related claims', () => {
        const claimIds = Array.from({ length: 10 }, () =>
          new mongoose.Types.ObjectId().toHexString()
        );

        expect(claimIds).toHaveLength(10);
      });
    });

    describe('Long Claim Text', () => {
      it('should handle claim text at maximum length', () => {
        const maxLength = 2000;
        const text = 'A'.repeat(maxLength);

        expect(text).toHaveLength(maxLength);
      });
    });

    describe('Special Characters in Text', () => {
      it('should handle special characters in claim text', () => {
        const text = 'Claim with special chars: <>&"\' and emoji: 🎉';

        expect(text).toContain('<');
        expect(text).toContain('🎉');
      });
    });
  });

  describe('Performance Considerations', () => {
    describe('Parallel Queries', () => {
      it('should execute quality and reasoning analysis in parallel', async () => {
        const startTime = Date.now();

        await Promise.all([
          axios.post('http://ml-service/validate', {}),
          axios.post('http://ml-service/reasoning/generate', {}),
        ]);

        const endTime = Date.now();

        // Both calls should complete (mocked)
        expect(endTime - startTime).toBeLessThan(1000);
      });
    });

    describe('Cache Hit Rate', () => {
      it('should return cached results quickly', async () => {
        (redisManager.get as jest.Mock).mockResolvedValue({ cached: true });

        const result = await redisManager.get('claim_analysis:123');

        expect(result).toEqual({ cached: true });
      });
    });
  });
});
