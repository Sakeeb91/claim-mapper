/**
 * Claim Model Unit Tests
 * Tests the Claim Mongoose schema, validation, and instance methods
 */

import mongoose from 'mongoose';
import Claim, { IClaim } from '../Claim';

describe('Claim Model', () => {
  const validClaimData = {
    text: 'This is a test claim with sufficient length for validation requirements.',
    type: 'assertion' as const,
    source: {
      type: 'manual' as const,
      reference: 'Test reference',
    },
    confidence: 0.85,
    position: {
      start: 0,
      end: 100,
    },
    project: new mongoose.Types.ObjectId(),
    creator: new mongoose.Types.ObjectId(),
  };

  describe('Schema Validation', () => {
    it('should require text field', () => {
      const claim = new Claim({
        ...validClaimData,
        text: undefined,
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors.text).toBeDefined();
    });

    it('should require type field', () => {
      const claim = new Claim({
        ...validClaimData,
        type: undefined,
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors.type).toBeDefined();
    });

    it('should require source.type field', () => {
      const claim = new Claim({
        ...validClaimData,
        source: { reference: 'ref' },
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors['source.type']).toBeDefined();
    });

    it('should require confidence field', () => {
      const claim = new Claim({
        ...validClaimData,
        confidence: undefined,
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors.confidence).toBeDefined();
    });

    it('should require project field', () => {
      const claim = new Claim({
        ...validClaimData,
        project: undefined,
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors.project).toBeDefined();
    });

    it('should require creator field', () => {
      const claim = new Claim({
        ...validClaimData,
        creator: undefined,
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors.creator).toBeDefined();
    });

    it('should require position.start field when position is provided', () => {
      const claim = new Claim({
        ...validClaimData,
        position: { end: 100 },
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors['position.start']).toBeDefined();
    });

    it('should require position.end field when position is provided', () => {
      const claim = new Claim({
        ...validClaimData,
        position: { start: 0 },
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors['position.end']).toBeDefined();
    });
  });

  describe('Type Validation', () => {
    const validTypes = ['assertion', 'question', 'hypothesis', 'conclusion', 'assumption'];

    validTypes.forEach((type) => {
      it(`should accept valid type: ${type}`, () => {
        const claim = new Claim({
          ...validClaimData,
          type,
        });

        const validationError = claim.validateSync();
        expect(validationError?.errors.type).toBeUndefined();
      });
    });

    it('should reject invalid type', () => {
      const claim = new Claim({
        ...validClaimData,
        type: 'invalid_type',
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors.type).toBeDefined();
    });
  });

  describe('Source Type Validation', () => {
    const validSourceTypes = ['document', 'url', 'manual', 'extracted'];

    validSourceTypes.forEach((sourceType) => {
      it(`should accept valid source type: ${sourceType}`, () => {
        const claim = new Claim({
          ...validClaimData,
          source: { type: sourceType },
        });

        const validationError = claim.validateSync();
        expect(validationError?.errors['source.type']).toBeUndefined();
      });
    });

    it('should reject invalid source type', () => {
      const claim = new Claim({
        ...validClaimData,
        source: { type: 'invalid_source' },
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors['source.type']).toBeDefined();
    });
  });

  describe('Confidence Validation', () => {
    it('should accept confidence value of 0', () => {
      const claim = new Claim({
        ...validClaimData,
        confidence: 0,
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors.confidence).toBeUndefined();
    });

    it('should accept confidence value of 1', () => {
      const claim = new Claim({
        ...validClaimData,
        confidence: 1,
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors.confidence).toBeUndefined();
    });

    it('should accept confidence value between 0 and 1', () => {
      const claim = new Claim({
        ...validClaimData,
        confidence: 0.5,
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors.confidence).toBeUndefined();
    });

    it('should reject confidence value less than 0', () => {
      const claim = new Claim({
        ...validClaimData,
        confidence: -0.1,
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors.confidence).toBeDefined();
    });

    it('should reject confidence value greater than 1', () => {
      const claim = new Claim({
        ...validClaimData,
        confidence: 1.1,
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors.confidence).toBeDefined();
    });
  });

  describe('Text Validation', () => {
    it('should enforce maxlength on text (2000 chars)', () => {
      const claim = new Claim({
        ...validClaimData,
        text: 'A'.repeat(2001),
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors.text).toBeDefined();
    });

    it('should trim text', () => {
      const claim = new Claim({
        ...validClaimData,
        text: '  This is a test claim with spaces  ',
      });

      expect(claim.text).toBe('This is a test claim with spaces');
    });

    it('should accept text at max length (2000 chars)', () => {
      const claim = new Claim({
        ...validClaimData,
        text: 'A'.repeat(2000),
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors.text).toBeUndefined();
    });
  });

  describe('Default Values', () => {
    it('should default status to draft', () => {
      const claim = new Claim(validClaimData);
      expect(claim.status).toBe('draft');
    });

    it('should default isActive to true', () => {
      const claim = new Claim(validClaimData);
      expect(claim.isActive).toBe(true);
    });

    it('should initialize evidence as empty array', () => {
      const claim = new Claim(validClaimData);
      expect(claim.evidence).toEqual([]);
    });

    it('should initialize relatedClaims as empty array', () => {
      const claim = new Claim(validClaimData);
      expect(claim.relatedClaims).toEqual([]);
    });

    it('should initialize reasoningChains as empty array', () => {
      const claim = new Claim(validClaimData);
      expect(claim.reasoningChains).toEqual([]);
    });

    it('should initialize keywords as empty array', () => {
      const claim = new Claim(validClaimData);
      expect(claim.keywords).toEqual([]);
    });

    it('should initialize tags as empty array', () => {
      const claim = new Claim(validClaimData);
      expect(claim.tags).toEqual([]);
    });

    it('should initialize versions as empty array', () => {
      const claim = new Claim(validClaimData);
      expect(claim.versions).toEqual([]);
    });

    it('should initialize comments as empty array', () => {
      const claim = new Claim(validClaimData);
      expect(claim.comments).toEqual([]);
    });

    it('should set default quality scores to 0', () => {
      const claim = new Claim(validClaimData);
      expect(claim.quality.overallScore).toBe(0);
      expect(claim.quality.clarityScore).toBe(0);
      expect(claim.quality.specificityScore).toBe(0);
      expect(claim.quality.evidenceScore).toBe(0);
      expect(claim.quality.biasScore).toBe(0);
      expect(claim.quality.factualityScore).toBe(0);
      expect(claim.quality.completenessScore).toBe(0);
    });
  });

  describe('Status Validation', () => {
    const validStatuses = ['draft', 'review', 'approved', 'rejected', 'archived'];

    validStatuses.forEach((status) => {
      it(`should accept valid status: ${status}`, () => {
        const claim = new Claim({
          ...validClaimData,
          status,
        });

        const validationError = claim.validateSync();
        expect(validationError?.errors.status).toBeUndefined();
      });
    });

    it('should reject invalid status', () => {
      const claim = new Claim({
        ...validClaimData,
        status: 'invalid_status',
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors.status).toBeDefined();
    });
  });

  describe('Related Claims Validation', () => {
    const validRelationships = ['supports', 'contradicts', 'questions', 'elaborates', 'similar'];

    validRelationships.forEach((relationship) => {
      it(`should accept valid relationship: ${relationship}`, () => {
        const claim = new Claim({
          ...validClaimData,
          relatedClaims: [
            {
              claimId: new mongoose.Types.ObjectId(),
              relationship,
              confidence: 0.8,
            },
          ],
        });

        const validationError = claim.validateSync();
        expect(validationError?.errors['relatedClaims.0.relationship']).toBeUndefined();
      });
    });

    it('should reject invalid relationship', () => {
      const claim = new Claim({
        ...validClaimData,
        relatedClaims: [
          {
            claimId: new mongoose.Types.ObjectId(),
            relationship: 'invalid_relationship',
            confidence: 0.8,
          },
        ],
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors['relatedClaims.0.relationship']).toBeDefined();
    });

    it('should require claimId in related claims', () => {
      const claim = new Claim({
        ...validClaimData,
        relatedClaims: [
          {
            relationship: 'supports',
            confidence: 0.8,
          },
        ],
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors['relatedClaims.0.claimId']).toBeDefined();
    });

    it('should require confidence in related claims', () => {
      const claim = new Claim({
        ...validClaimData,
        relatedClaims: [
          {
            claimId: new mongoose.Types.ObjectId(),
            relationship: 'supports',
          },
        ],
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors['relatedClaims.0.confidence']).toBeDefined();
    });

    it('should validate confidence range in related claims', () => {
      const claim = new Claim({
        ...validClaimData,
        relatedClaims: [
          {
            claimId: new mongoose.Types.ObjectId(),
            relationship: 'supports',
            confidence: 1.5, // Invalid
          },
        ],
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors['relatedClaims.0.confidence']).toBeDefined();
    });
  });

  describe('Virtual Properties', () => {
    it('should calculate wordCount correctly', () => {
      const claim = new Claim({
        ...validClaimData,
        text: 'This is a test claim with eight words exactly.',
      });

      expect(claim.get('wordCount')).toBe(9);
    });

    it('should calculate wordCount as 1 for single word', () => {
      const claim = new Claim({
        ...validClaimData,
        text: 'Single',
      });

      expect(claim.get('wordCount')).toBe(1);
    });

    it('should calculate evidenceCount correctly', () => {
      const claim = new Claim({
        ...validClaimData,
        evidence: [
          new mongoose.Types.ObjectId(),
          new mongoose.Types.ObjectId(),
          new mongoose.Types.ObjectId(),
        ],
      });

      expect(claim.get('evidenceCount')).toBe(3);
    });

    it('should return 0 for empty evidence array', () => {
      const claim = new Claim(validClaimData);
      expect(claim.get('evidenceCount')).toBe(0);
    });

    it('should calculate relationCount correctly', () => {
      const claim = new Claim({
        ...validClaimData,
        relatedClaims: [
          {
            claimId: new mongoose.Types.ObjectId(),
            relationship: 'supports',
            confidence: 0.8,
          },
          {
            claimId: new mongoose.Types.ObjectId(),
            relationship: 'contradicts',
            confidence: 0.6,
          },
        ],
      });

      expect(claim.get('relationCount')).toBe(2);
    });
  });

  describe('Tags and Keywords', () => {
    it('should lowercase tags', () => {
      const claim = new Claim({
        ...validClaimData,
        tags: ['TEST', 'Sample', 'UPPERCASE'],
      });

      expect(claim.tags).toEqual(['test', 'sample', 'uppercase']);
    });

    it('should trim tags', () => {
      const claim = new Claim({
        ...validClaimData,
        tags: ['  test  ', '  sample  '],
      });

      expect(claim.tags).toEqual(['test', 'sample']);
    });

    it('should enforce maxlength on tags (30 chars)', () => {
      const claim = new Claim({
        ...validClaimData,
        tags: ['A'.repeat(31)],
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors['tags.0']).toBeDefined();
    });

    it('should lowercase keywords', () => {
      const claim = new Claim({
        ...validClaimData,
        keywords: ['KEYWORD', 'Test'],
      });

      expect(claim.keywords).toEqual(['keyword', 'test']);
    });
  });

  describe('Collaborators Validation', () => {
    const validRoles = ['viewer', 'editor', 'reviewer'];

    validRoles.forEach((role) => {
      it(`should accept valid collaborator role: ${role}`, () => {
        const claim = new Claim({
          ...validClaimData,
          collaborators: [
            {
              user: new mongoose.Types.ObjectId(),
              role,
              addedBy: new mongoose.Types.ObjectId(),
            },
          ],
        });

        const validationError = claim.validateSync();
        expect(validationError?.errors['collaborators.0.role']).toBeUndefined();
      });
    });

    it('should require user in collaborator', () => {
      const claim = new Claim({
        ...validClaimData,
        collaborators: [
          {
            role: 'viewer',
            addedBy: new mongoose.Types.ObjectId(),
          },
        ],
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors['collaborators.0.user']).toBeDefined();
    });

    it('should require addedBy in collaborator', () => {
      const claim = new Claim({
        ...validClaimData,
        collaborators: [
          {
            user: new mongoose.Types.ObjectId(),
            role: 'viewer',
          },
        ],
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors['collaborators.0.addedBy']).toBeDefined();
    });
  });

  describe('Comments Validation', () => {
    it('should require user in comment', () => {
      const claim = new Claim({
        ...validClaimData,
        comments: [
          {
            text: 'This is a comment',
          },
        ],
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors['comments.0.user']).toBeDefined();
    });

    it('should require text in comment', () => {
      const claim = new Claim({
        ...validClaimData,
        comments: [
          {
            user: new mongoose.Types.ObjectId(),
          },
        ],
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors['comments.0.text']).toBeDefined();
    });

    it('should enforce maxlength on comment text (1000 chars)', () => {
      const claim = new Claim({
        ...validClaimData,
        comments: [
          {
            user: new mongoose.Types.ObjectId(),
            text: 'A'.repeat(1001),
          },
        ],
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors['comments.0.text']).toBeDefined();
    });

    it('should default resolved to false', () => {
      const claim = new Claim({
        ...validClaimData,
        comments: [
          {
            user: new mongoose.Types.ObjectId(),
            text: 'This is a comment',
          },
        ],
      });

      expect(claim.comments[0].resolved).toBe(false);
    });
  });

  describe('Versions', () => {
    it('should require versionNumber in version', () => {
      const claim = new Claim({
        ...validClaimData,
        versions: [
          {
            text: 'Previous text',
            changedBy: new mongoose.Types.ObjectId(),
          },
        ],
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors['versions.0.versionNumber']).toBeDefined();
    });

    it('should require text in version', () => {
      const claim = new Claim({
        ...validClaimData,
        versions: [
          {
            versionNumber: 1,
            changedBy: new mongoose.Types.ObjectId(),
          },
        ],
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors['versions.0.text']).toBeDefined();
    });

    it('should require changedBy in version', () => {
      const claim = new Claim({
        ...validClaimData,
        versions: [
          {
            versionNumber: 1,
            text: 'Previous text',
          },
        ],
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors['versions.0.changedBy']).toBeDefined();
    });
  });

  describe('Quality Scores Validation', () => {
    const qualityFields = [
      'overallScore',
      'clarityScore',
      'specificityScore',
      'evidenceScore',
      'biasScore',
      'factualityScore',
      'completenessScore',
    ];

    qualityFields.forEach((field) => {
      it(`should validate ${field} is between 0 and 1`, () => {
        const claim = new Claim({
          ...validClaimData,
          quality: {
            [field]: 1.5, // Invalid
          },
        });

        const validationError = claim.validateSync();
        expect(validationError?.errors[`quality.${field}`]).toBeDefined();
      });
    });

    it('should accept valid quality scores', () => {
      const claim = new Claim({
        ...validClaimData,
        quality: {
          overallScore: 0.85,
          clarityScore: 0.9,
          specificityScore: 0.8,
          evidenceScore: 0.75,
          biasScore: 0.7,
          factualityScore: 0.85,
          completenessScore: 0.8,
          issues: ['Minor clarity issue'],
          recommendations: ['Add more evidence'],
        },
      });

      const validationError = claim.validateSync();
      qualityFields.forEach((field) => {
        expect(validationError?.errors[`quality.${field}`]).toBeUndefined();
      });
    });
  });

  describe('Entities Validation', () => {
    it('should require text in entity', () => {
      const claim = new Claim({
        ...validClaimData,
        entities: [
          {
            type: 'PERSON',
            confidence: 0.9,
            position: { start: 0, end: 10 },
          },
        ],
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors['entities.0.text']).toBeDefined();
    });

    it('should require type in entity', () => {
      const claim = new Claim({
        ...validClaimData,
        entities: [
          {
            text: 'John Doe',
            confidence: 0.9,
            position: { start: 0, end: 10 },
          },
        ],
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors['entities.0.type']).toBeDefined();
    });

    it('should validate entity confidence range', () => {
      const claim = new Claim({
        ...validClaimData,
        entities: [
          {
            text: 'John Doe',
            type: 'PERSON',
            confidence: 1.5, // Invalid
            position: { start: 0, end: 10 },
          },
        ],
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors['entities.0.confidence']).toBeDefined();
    });

    it('should require position.start in entity', () => {
      const claim = new Claim({
        ...validClaimData,
        entities: [
          {
            text: 'John Doe',
            type: 'PERSON',
            confidence: 0.9,
            position: { end: 10 },
          },
        ],
      });

      const validationError = claim.validateSync();
      expect(validationError?.errors['entities.0.position.start']).toBeDefined();
    });
  });

  describe('Schema Indexes', () => {
    it('should have index on project field', () => {
      const indexes = Claim.schema.indexes();
      const projectIndex = indexes.find((idx) => idx[0].project !== undefined);
      expect(projectIndex).toBeDefined();
    });

    it('should have index on creator field', () => {
      const indexes = Claim.schema.indexes();
      const creatorIndex = indexes.find((idx) => idx[0].creator !== undefined);
      expect(creatorIndex).toBeDefined();
    });

    it('should have index on type field', () => {
      const indexes = Claim.schema.indexes();
      const typeIndex = indexes.find((idx) => idx[0].type !== undefined);
      expect(typeIndex).toBeDefined();
    });

    it('should have index on status field', () => {
      const indexes = Claim.schema.indexes();
      const statusIndex = indexes.find((idx) => idx[0].status !== undefined);
      expect(statusIndex).toBeDefined();
    });

    it('should have index on confidence field', () => {
      const indexes = Claim.schema.indexes();
      const confidenceIndex = indexes.find((idx) => idx[0].confidence !== undefined);
      expect(confidenceIndex).toBeDefined();
    });

    it('should have compound index on project and creator', () => {
      const indexes = Claim.schema.indexes();
      const compoundIndex = indexes.find(
        (idx) => idx[0].project !== undefined && idx[0].creator !== undefined
      );
      expect(compoundIndex).toBeDefined();
    });
  });
});
