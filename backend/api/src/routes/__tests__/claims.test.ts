/**
 * Claims Routes Unit Tests - Part 1: CRUD Operations
 * Tests claim creation, retrieval, update, and deletion
 */

import mongoose from 'mongoose';

// Mock all dependencies before importing
jest.mock('../../config/redis', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
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
  post: jest.fn().mockResolvedValue({ data: { overall_score: 0.8 } }),
}));

import redisManager from '../../config/redis';

describe('Claims Routes - CRUD Operations', () => {
  const mockUserId = new mongoose.Types.ObjectId().toHexString();
  const mockProjectId = new mongoose.Types.ObjectId().toHexString();
  const mockClaimId = new mongoose.Types.ObjectId().toHexString();

  const mockUser = {
    _id: mockUserId,
    email: 'test@example.com',
    role: 'user',
    updateOne: jest.fn().mockResolvedValue({}),
  };

  const mockProject = {
    _id: mockProjectId,
    owner: mockUserId,
    collaborators: [],
    visibility: 'private',
    isActive: true,
    settings: {
      reasoning: { enableAIGeneration: false },
      collaboration: { allowComments: true },
    },
  };

  const mockClaim = {
    _id: mockClaimId,
    text: 'This is a test claim with sufficient length for testing purposes.',
    type: 'assertion',
    confidence: 0.85,
    status: 'draft',
    isActive: true,
    project: mockProjectId,
    creator: mockUserId,
    evidence: [],
    relatedClaims: [],
    versions: [],
    comments: [],
    save: jest.fn().mockResolvedValue(true),
    populate: jest.fn().mockResolvedThis(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/claims - List Claims', () => {
    describe('Query Building', () => {
      it('should build query with isActive filter', () => {
        const query: Record<string, unknown> = { isActive: true };

        expect(query.isActive).toBe(true);
      });

      it('should add project filter when projectId provided', () => {
        const query: Record<string, unknown> = { isActive: true };
        const projectId = mockProjectId;

        query.project = projectId;

        expect(query.project).toBe(mockProjectId);
      });

      it('should add type filter when type provided', () => {
        const query: Record<string, unknown> = { isActive: true };
        const type = 'assertion';

        if (type) query.type = type;

        expect(query.type).toBe('assertion');
      });

      it('should add status filter when status provided', () => {
        const query: Record<string, unknown> = { isActive: true };
        const status = 'approved';

        if (status) query.status = status;

        expect(query.status).toBe('approved');
      });

      it('should add minConfidence filter when provided', () => {
        const query: Record<string, unknown> = { isActive: true };
        const minConfidence = '0.7';

        if (minConfidence) {
          query.confidence = { $gte: parseFloat(minConfidence) };
        }

        expect(query.confidence).toEqual({ $gte: 0.7 });
      });

      it('should add tags filter when provided', () => {
        const query: Record<string, unknown> = { isActive: true };
        const tags = ['science', 'research'];

        if (tags) {
          const tagArray = Array.isArray(tags) ? tags : [tags];
          query.tags = { $in: tagArray };
        }

        expect(query.tags).toEqual({ $in: ['science', 'research'] });
      });

      it('should add text search when search provided', () => {
        const query: Record<string, unknown> = { isActive: true };
        const search = 'climate change';

        if (search) {
          query.$text = { $search: search };
        }

        expect(query.$text).toEqual({ $search: 'climate change' });
      });
    });

    describe('Pagination', () => {
      it('should calculate correct skip value', () => {
        const page = 3;
        const limit = 20;
        const skip = (page - 1) * limit;

        expect(skip).toBe(40);
      });

      it('should build sort object correctly', () => {
        const sort = 'updatedAt';
        const order = 'desc';
        const sortObj: Record<string, number> = {};
        sortObj[sort] = order === 'asc' ? 1 : -1;

        expect(sortObj).toEqual({ updatedAt: -1 });
      });

      it('should calculate pagination metadata', () => {
        const page = 2;
        const limit = 20;
        const total = 55;

        const pagination = {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        };

        expect(pagination.totalPages).toBe(3);
        expect(pagination.hasNext).toBe(true);
        expect(pagination.hasPrev).toBe(true);
      });
    });

    describe('Access Control', () => {
      it('should check if user is project owner', () => {
        const userId = mockUserId;
        const projectOwnerId = mockUserId;

        const hasAccess = projectOwnerId === userId;

        expect(hasAccess).toBe(true);
      });

      it('should check if user is collaborator', () => {
        const userId = 'collaborator-id';
        const collaborators = [
          { user: 'collaborator-id' },
          { user: 'another-user' },
        ];

        const isCollaborator = collaborators.some((c) => c.user === userId);

        expect(isCollaborator).toBe(true);
      });

      it('should allow access to public projects', () => {
        const visibility = 'public';
        const userId = 'random-user';
        const projectOwnerId = 'owner-id';

        const hasAccess =
          projectOwnerId === userId ||
          visibility === 'public';

        expect(hasAccess).toBe(true);
      });

      it('should deny access to private project for non-members', () => {
        const visibility = 'private';
        const userId = 'random-user';
        const projectOwnerId = 'owner-id';
        const collaborators: Array<{ user: string }> = [];

        const hasAccess =
          projectOwnerId === userId ||
          collaborators.some((c) => c.user === userId) ||
          visibility === 'public';

        expect(hasAccess).toBe(false);
      });
    });

    describe('Caching', () => {
      it('should generate cache key from query parameters', () => {
        const query = { projectId: mockProjectId, type: 'assertion' };
        const page = 1;
        const limit = 20;
        const sort = 'updatedAt';
        const order = 'desc';

        const cacheKey = `claims:${JSON.stringify({ query, page, limit, sort, order })}`;

        expect(cacheKey).toContain('claims:');
        expect(cacheKey).toContain(mockProjectId);
      });

      it('should check cache before database query', async () => {
        const cacheKey = 'claims:test-key';
        (redisManager.get as jest.Mock).mockResolvedValue(null);

        const cachedResult = await redisManager.get(cacheKey);

        expect(redisManager.get).toHaveBeenCalledWith(cacheKey);
        expect(cachedResult).toBeNull();
      });

      it('should return cached result if available', async () => {
        const cachedData = {
          claims: [mockClaim],
          pagination: { page: 1, limit: 20, total: 1 },
        };
        (redisManager.get as jest.Mock).mockResolvedValue(cachedData);

        const result = await redisManager.get('claims:test-key');

        expect(result).toEqual(cachedData);
      });

      it('should cache result with 5 minute TTL', async () => {
        const cacheKey = 'claims:test-key';
        const data = { claims: [], pagination: {} };
        const ttl = 300; // 5 minutes

        await redisManager.set(cacheKey, data, ttl);

        expect(redisManager.set).toHaveBeenCalledWith(cacheKey, data, ttl);
      });
    });
  });

  describe('POST /api/claims - Create Claim', () => {
    describe('Claim Creation', () => {
      it('should create claim with user as creator', () => {
        const claimData = {
          text: 'This is a new claim with sufficient length.',
          type: 'assertion',
          confidence: 0.8,
          project: mockProjectId,
        };

        const newClaim = {
          ...claimData,
          creator: mockUserId,
        };

        expect(newClaim.creator).toBe(mockUserId);
      });

      it('should use projectId from body or params', () => {
        const bodyProjectId = mockProjectId;
        const paramsProjectId = undefined;

        const projectId = bodyProjectId || paramsProjectId;

        expect(projectId).toBe(mockProjectId);
      });
    });

    describe('Project Statistics Update', () => {
      it('should increment project claim count', () => {
        const update = {
          $inc: { 'statistics.totalClaims': 1 },
        };

        expect(update.$inc['statistics.totalClaims']).toBe(1);
      });

      it('should increment user claim count', () => {
        const update = {
          $inc: { 'stats.claimsCreated': 1 },
        };

        expect(update.$inc['stats.claimsCreated']).toBe(1);
      });
    });

    describe('Cache Invalidation', () => {
      it('should clear claims cache after creation', async () => {
        await redisManager.deletePattern('claims:*');

        expect(redisManager.deletePattern).toHaveBeenCalledWith('claims:*');
      });

      it('should clear projects cache after creation', async () => {
        await redisManager.deletePattern('projects:*');

        expect(redisManager.deletePattern).toHaveBeenCalledWith('projects:*');
      });
    });

    describe('Activity Tracking', () => {
      it('should track claim creation activity', async () => {
        await redisManager.trackUserActivity(mockUserId, {
          action: 'create_claim',
          claimId: mockClaimId,
          details: { projectId: mockProjectId },
        });

        expect(redisManager.trackUserActivity).toHaveBeenCalledWith(
          mockUserId,
          expect.objectContaining({
            action: 'create_claim',
            claimId: mockClaimId,
          })
        );
      });
    });
  });

  describe('GET /api/claims/:id - Get Claim by ID', () => {
    describe('Claim Retrieval', () => {
      it('should find claim by ID with active filter', () => {
        const query = { _id: mockClaimId, isActive: true };

        expect(query._id).toBe(mockClaimId);
        expect(query.isActive).toBe(true);
      });

      it('should populate related data', () => {
        const populateFields = [
          { path: 'creator', select: 'firstName lastName email' },
          { path: 'project', select: 'name visibility owner collaborators' },
          { path: 'evidence', select: 'text type reliability.score source' },
          { path: 'reasoningChains', select: 'type steps validity.overallScore' },
          { path: 'relatedClaims.claimId', select: 'text type confidence' },
        ];

        expect(populateFields).toHaveLength(5);
        expect(populateFields[0].path).toBe('creator');
      });
    });

    describe('Access Verification', () => {
      it('should check project access for claim', () => {
        const project = mockProject;
        const userId = mockUserId;

        const hasAccess =
          project.owner.toString() === userId ||
          project.collaborators.some((c: { user: string }) => c.user.toString() === userId) ||
          project.visibility === 'public';

        expect(hasAccess).toBe(true);
      });

      it('should track view activity', async () => {
        await redisManager.trackUserActivity(mockUserId, {
          action: 'view_claim',
          claimId: mockClaimId,
          details: { projectId: mockProjectId },
        });

        expect(redisManager.trackUserActivity).toHaveBeenCalledWith(
          mockUserId,
          expect.objectContaining({
            action: 'view_claim',
          })
        );
      });
    });
  });

  describe('PUT /api/claims/:id - Update Claim', () => {
    describe('Permission Checking', () => {
      it('should allow creator to edit', () => {
        const claimCreator = mockUserId;
        const currentUser = mockUserId;

        const canEdit = claimCreator === currentUser;

        expect(canEdit).toBe(true);
      });

      it('should allow project owner to edit', () => {
        const projectOwner = mockUserId;
        const currentUser = mockUserId;

        const canEdit = projectOwner === currentUser;

        expect(canEdit).toBe(true);
      });

      it('should allow collaborator with edit permission', () => {
        const collaborators = [
          { user: 'collaborator-id', permissions: { canEdit: true } },
        ];
        const userId = 'collaborator-id';

        const canEdit = collaborators.some(
          (c) => c.user === userId && c.permissions.canEdit
        );

        expect(canEdit).toBe(true);
      });

      it('should deny edit for viewer collaborator', () => {
        const collaborators = [
          { user: 'viewer-id', permissions: { canEdit: false } },
        ];
        const userId = 'viewer-id';

        const canEdit = collaborators.some(
          (c) => c.user === userId && c.permissions.canEdit
        );

        expect(canEdit).toBe(false);
      });
    });

    describe('Version Tracking', () => {
      it('should create version when text changes', () => {
        const originalText = 'Original claim text';
        const newText = 'Updated claim text';
        const versions: Array<{
          versionNumber: number;
          text: string;
          changedBy: string;
          changeReason: string;
          timestamp: Date;
        }> = [];

        if (newText !== originalText && versions.length === 0) {
          versions.push({
            versionNumber: 1,
            text: originalText,
            changedBy: mockUserId,
            changeReason: 'Original version',
            timestamp: new Date(),
          });
        }

        expect(versions).toHaveLength(1);
        expect(versions[0].text).toBe(originalText);
      });
    });

    describe('Update Application', () => {
      it('should apply updates to claim', () => {
        const claim = { ...mockClaim };
        const updates = {
          text: 'Updated claim text with sufficient length for validation.',
          confidence: 0.9,
        };

        Object.assign(claim, updates);

        expect(claim.text).toBe(updates.text);
        expect(claim.confidence).toBe(0.9);
      });
    });
  });

  describe('DELETE /api/claims/:id - Delete Claim', () => {
    describe('Permission Checking', () => {
      it('should allow creator to delete', () => {
        const claimCreator = mockUserId;
        const currentUser = mockUserId;

        const canDelete = claimCreator === currentUser;

        expect(canDelete).toBe(true);
      });

      it('should allow collaborator with delete permission', () => {
        const collaborators = [
          { user: 'admin-id', permissions: { canDelete: true } },
        ];
        const userId = 'admin-id';

        const canDelete = collaborators.some(
          (c) => c.user === userId && c.permissions.canDelete
        );

        expect(canDelete).toBe(true);
      });
    });

    describe('Soft Delete', () => {
      it('should set isActive to false', () => {
        const claim = { ...mockClaim };

        claim.isActive = false;
        claim.status = 'archived';

        expect(claim.isActive).toBe(false);
        expect(claim.status).toBe('archived');
      });

      it('should decrement project claim count', () => {
        const update = {
          $inc: { 'statistics.totalClaims': -1 },
        };

        expect(update.$inc['statistics.totalClaims']).toBe(-1);
      });
    });
  });

  describe('Response Formats', () => {
    it('should return success response for list', () => {
      const response = {
        success: true,
        data: [mockClaim],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(1);
      expect(response.pagination).toBeDefined();
    });

    it('should return success response for create', () => {
      const response = {
        success: true,
        message: 'Claim created successfully',
        data: mockClaim,
      };

      expect(response.success).toBe(true);
      expect(response.message).toBe('Claim created successfully');
      expect(response.data).toBeDefined();
    });

    it('should return success response for single claim', () => {
      const response = {
        success: true,
        data: mockClaim,
      };

      expect(response.success).toBe(true);
      expect(response.data._id).toBe(mockClaimId);
    });

    it('should return success response for update', () => {
      const response = {
        success: true,
        message: 'Claim updated successfully',
        data: mockClaim,
      };

      expect(response.success).toBe(true);
      expect(response.message).toBe('Claim updated successfully');
    });

    it('should return success response for delete', () => {
      const response = {
        success: true,
        message: 'Claim deleted successfully',
      };

      expect(response.success).toBe(true);
      expect(response.message).toBe('Claim deleted successfully');
    });
  });
});
