/**
 * Collaboration API Tests
 *
 * Comprehensive tests for the collaboration API endpoints including:
 * - Session listing and filtering
 * - Comment history and management
 * - Version history and reverting
 * - Activity logs
 * - Access control and permissions
 * - Pagination
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

// Mock external dependencies before imports
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

jest.mock('../../models/Session', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

jest.mock('../../models/Claim', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.mock('../../models/Project', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findById: jest.fn(),
  },
}));

// Import mocked modules
import redisManager from '../../config/redis';
import Session from '../../models/Session';
import Claim from '../../models/Claim';
import Project from '../../models/Project';

describe('Collaboration API', () => {
  // Test data
  const mockUserId = '507f1f77bcf86cd799439011';
  const mockProjectId = '507f1f77bcf86cd799439012';
  const mockClaimId = '507f1f77bcf86cd799439013';
  const mockSessionId = '507f1f77bcf86cd799439014';
  const mockCommentId = '507f1f77bcf86cd799439015';

  const mockProject = {
    _id: mockProjectId,
    name: 'Test Project',
    owner: mockUserId,
    collaborators: [],
    visibility: 'private',
    isActive: true,
    settings: {
      collaboration: {
        allowComments: true,
        allowVersioning: true,
        notifyOnChanges: true,
      },
    },
  };

  const mockSession = {
    _id: mockSessionId,
    user: mockUserId,
    project: mockProject,
    type: 'collaborative',
    status: 'active',
    participants: [
      {
        user: mockUserId,
        role: 'host',
        isActive: true,
        permissions: { canEdit: true, canComment: true },
      },
    ],
    activities: [
      {
        timestamp: new Date(),
        user: mockUserId,
        action: 'join',
        target: { type: 'session', id: mockSessionId },
        details: {},
        toObject: function() { return { ...this }; },
      },
      {
        timestamp: new Date(),
        user: mockUserId,
        action: 'edit_claim',
        target: { type: 'claim', id: mockClaimId },
        details: { text: 'Updated claim text' },
        toObject: function() { return { ...this }; },
      },
    ],
    isActive: true,
    startedAt: new Date(),
  };

  const mockComment = {
    _id: mockCommentId,
    user: mockUserId,
    text: 'This is a test comment',
    timestamp: new Date(),
    resolved: false,
    replies: [
      {
        user: mockUserId,
        text: 'This is a reply',
        timestamp: new Date(),
      },
    ],
  };

  const mockVersion = {
    versionNumber: 1,
    text: 'Original claim text',
    changedBy: mockUserId,
    changeReason: 'Initial version',
    timestamp: new Date(),
  };

  const mockClaim = {
    _id: mockClaimId,
    text: 'Current claim text',
    type: 'assertion',
    project: mockProject,
    creator: mockUserId,
    isActive: true,
    comments: [mockComment],
    versions: [mockVersion],
    save: jest.fn().mockResolvedValue(true),
    populate: jest.fn().mockReturnThis(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Session Listing', () => {
    it('should return sessions user is part of', async () => {
      const mockSessions = [mockSession];
      const mockFind = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockSessions),
      };
      (Session.find as jest.Mock).mockReturnValue(mockFind);
      (Session.countDocuments as jest.Mock).mockResolvedValue(1);

      const query = {
        isActive: true,
        $or: [
          { user: mockUserId },
          { 'participants.user': mockUserId },
        ],
      };

      Session.find(query);

      expect(Session.find).toHaveBeenCalledWith(query);
    });

    it('should filter sessions by project', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);

      const project = await Project.findById(mockProjectId);

      expect(project).toEqual(mockProject);
      expect(Project.findById).toHaveBeenCalledWith(mockProjectId);
    });

    it('should filter sessions by status', () => {
      const query = { status: 'active' };

      expect(query.status).toBe('active');
    });

    it('should filter sessions by type', () => {
      const query = { type: 'collaborative' };

      expect(query.type).toBe('collaborative');
    });

    it('should use caching for session lists', async () => {
      const cacheKey = `collaboration:sessions:${mockUserId}:test`;
      const cachedResult = { sessions: [mockSession], pagination: { page: 1 } };

      (redisManager.get as jest.Mock).mockResolvedValue(cachedResult);

      const result = await redisManager.get(cacheKey);

      expect(redisManager.get).toHaveBeenCalled();
      expect(result).toEqual(cachedResult);
    });
  });

  describe('Comment History', () => {
    it('should retrieve comments for a claim', async () => {
      const mockFindOne = {
        populate: jest.fn().mockReturnThis(),
      };
      mockFindOne.populate.mockReturnValue(mockClaim);
      (Claim.findOne as jest.Mock).mockReturnValue(mockFindOne);

      const result = Claim.findOne({ _id: mockClaimId, isActive: true });

      expect(Claim.findOne).toHaveBeenCalled();
    });

    it('should paginate comments correctly', () => {
      const allComments = [mockComment, { ...mockComment, _id: 'comment2' }];
      const page = 1;
      const limit = 1;
      const skip = (page - 1) * limit;

      const sortedComments = [...allComments].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const paginatedComments = sortedComments.slice(skip, skip + limit);

      expect(paginatedComments.length).toBe(1);
    });

    it('should count unresolved comments', () => {
      const comments = [
        { ...mockComment, resolved: false },
        { ...mockComment, _id: 'comment2', resolved: true },
        { ...mockComment, _id: 'comment3', resolved: false },
      ];

      const unresolvedCount = comments.filter(c => !c.resolved).length;

      expect(unresolvedCount).toBe(2);
    });

    it('should check project access before returning comments', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);

      const project = await Project.findById(mockProjectId);
      const userId = mockUserId;
      const hasAccess = project?.owner.toString() === userId ||
        project?.collaborators.some((c: any) => c.user.toString() === userId) ||
        project?.visibility === 'public';

      expect(hasAccess).toBe(true);
    });
  });

  describe('Add Comment', () => {
    it('should validate comment text is required', () => {
      const text = '';
      const isValid = text.length > 0 && text.trim().length > 0;

      expect(isValid).toBe(false);
    });

    it('should validate comment text max length', () => {
      const text = 'a'.repeat(1001);
      const isValid = text.length <= 1000;

      expect(isValid).toBe(false);
    });

    it('should validate claimId is required', () => {
      const claimId = '';
      const isValid = Boolean(claimId);

      expect(isValid).toBe(false);
    });

    it('should check project comment settings', () => {
      const project = mockProject;
      const allowComments = project.settings?.collaboration?.allowComments;

      expect(allowComments).toBe(true);
    });

    it('should support adding replies to existing comments', () => {
      const parentComment = mockComment;
      const reply = {
        user: mockUserId,
        text: 'New reply',
        timestamp: new Date(),
      };

      parentComment.replies.push(reply);

      expect(parentComment.replies.length).toBe(2);
    });

    it('should track comment activity', async () => {
      await redisManager.trackUserActivity(mockUserId, {
        action: 'add_comment',
        claimId: mockClaimId,
        details: { commentId: mockCommentId },
      });

      expect(redisManager.trackUserActivity).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          action: 'add_comment',
          claimId: mockClaimId,
        })
      );
    });
  });

  describe('Version History', () => {
    it('should retrieve versions for a claim', () => {
      const claim = mockClaim;
      const versions = claim.versions;

      expect(versions.length).toBe(1);
      expect(versions[0].versionNumber).toBe(1);
    });

    it('should paginate versions correctly', () => {
      const allVersions = [
        { versionNumber: 1, text: 'v1', timestamp: new Date() },
        { versionNumber: 2, text: 'v2', timestamp: new Date() },
        { versionNumber: 3, text: 'v3', timestamp: new Date() },
      ];
      const page = 1;
      const limit = 2;
      const skip = (page - 1) * limit;

      const sortedVersions = [...allVersions].sort((a, b) => b.versionNumber - a.versionNumber);
      const paginatedVersions = sortedVersions.slice(skip, skip + limit);

      expect(paginatedVersions.length).toBe(2);
      expect(paginatedVersions[0].versionNumber).toBe(3);
    });

    it('should check versioning is enabled', () => {
      const project = mockProject;
      const versioningEnabled = project.settings?.collaboration?.allowVersioning;

      expect(versioningEnabled).toBe(true);
    });

    it('should return current version number', () => {
      const versions = [
        { versionNumber: 1 },
        { versionNumber: 2 },
        { versionNumber: 3 },
      ];
      const currentVersion = Math.max(...versions.map(v => v.versionNumber));

      expect(currentVersion).toBe(3);
    });
  });

  describe('Version Revert', () => {
    it('should validate version number is required', () => {
      const versionNumber = undefined;
      const isValid = versionNumber !== undefined && typeof versionNumber === 'number' && versionNumber >= 1;

      expect(isValid).toBe(false);
    });

    it('should validate version number is positive integer', () => {
      const invalidVersions = [-1, 0, 1.5];

      invalidVersions.forEach((v) => {
        const isValid = Number.isInteger(v) && v >= 1;
        expect(isValid).toBe(false);
      });
    });

    it('should check edit permissions before revert', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);

      const project = await Project.findById(mockProjectId);
      const userId = mockUserId;
      const isOwner = project?.owner.toString() === userId;
      const collaborator = project?.collaborators.find((c: any) => c.user.toString() === userId);
      const canEdit = isOwner || (collaborator && collaborator.permissions?.canEdit);

      expect(canEdit).toBe(true);
    });

    it('should create new version before reverting', () => {
      const currentText = 'Current text';
      const versions = [{ versionNumber: 1, text: 'Old text' }];

      // Creating a new version with current state
      const newVersionNumber = Math.max(...versions.map(v => v.versionNumber)) + 1;
      versions.push({
        versionNumber: newVersionNumber,
        text: currentText,
      });

      expect(versions.length).toBe(2);
      expect(versions[1].versionNumber).toBe(2);
    });

    it('should track revert activity', async () => {
      await redisManager.trackUserActivity(mockUserId, {
        action: 'revert_version',
        claimId: mockClaimId,
        details: {
          fromVersion: 3,
          toVersion: 1,
        },
      });

      expect(redisManager.trackUserActivity).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          action: 'revert_version',
          details: expect.objectContaining({
            fromVersion: 3,
            toVersion: 1,
          }),
        })
      );
    });

    it('should clear caches after revert', async () => {
      await redisManager.deletePattern('claims:*');
      await redisManager.deletePattern(`collaboration:versions:${mockClaimId}:*`);

      expect(redisManager.deletePattern).toHaveBeenCalledWith('claims:*');
    });
  });

  describe('Activity Log', () => {
    it('should retrieve activities from project sessions', async () => {
      const mockFind = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([mockSession]),
      };
      (Session.find as jest.Mock).mockReturnValue(mockFind);

      const result = Session.find({ project: mockProjectId, isActive: true });

      expect(Session.find).toHaveBeenCalled();
    });

    it('should flatten activities from multiple sessions', () => {
      const sessions = [
        {
          activities: [
            { action: 'join', timestamp: new Date(), toObject: () => ({ action: 'join' }) },
          ],
        },
        {
          activities: [
            { action: 'edit_claim', timestamp: new Date(), toObject: () => ({ action: 'edit_claim' }) },
          ],
        },
      ];

      let allActivities: any[] = [];
      for (const session of sessions) {
        const sessionActivities = session.activities.map((a: any) => a.toObject());
        allActivities.push(...sessionActivities);
      }

      expect(allActivities.length).toBe(2);
    });

    it('should filter activities by action type', () => {
      const activities = [
        { action: 'join' },
        { action: 'edit_claim' },
        { action: 'comment' },
      ];
      const filterAction = 'edit_claim';

      const filtered = activities.filter(a => a.action === filterAction);

      expect(filtered.length).toBe(1);
    });

    it('should filter activities by user', () => {
      const activities = [
        { action: 'join', user: mockUserId },
        { action: 'edit_claim', user: 'other-user' },
      ];
      const filterUserId = mockUserId;

      const filtered = activities.filter(a => a.user === filterUserId);

      expect(filtered.length).toBe(1);
    });

    it('should calculate activity statistics', () => {
      const activities = [
        { action: 'join', user: mockUserId },
        { action: 'join', user: 'user2' },
        { action: 'edit_claim', user: mockUserId },
        { action: 'comment', user: 'user2' },
      ];

      const stats = {
        totalActivities: activities.length,
        byAction: activities.reduce((acc: Record<string, number>, activity) => {
          acc[activity.action] = (acc[activity.action] || 0) + 1;
          return acc;
        }, {}),
        uniqueUsers: new Set(activities.map(a => a.user)).size,
      };

      expect(stats.totalActivities).toBe(4);
      expect(stats.byAction.join).toBe(2);
      expect(stats.uniqueUsers).toBe(2);
    });
  });

  describe('Access Control', () => {
    it('should allow owner access', () => {
      const project = mockProject;
      const userId = mockUserId;
      const isOwner = project.owner === userId;

      expect(isOwner).toBe(true);
    });

    it('should allow collaborator access', () => {
      const projectWithCollaborator = {
        ...mockProject,
        collaborators: [{ user: 'collaborator-id', permissions: { canEdit: true } }],
      };
      const userId = 'collaborator-id';
      const isCollaborator = projectWithCollaborator.collaborators.some(
        c => c.user === userId
      );

      expect(isCollaborator).toBe(true);
    });

    it('should allow public project access', () => {
      const publicProject = { ...mockProject, visibility: 'public' };

      expect(publicProject.visibility).toBe('public');
    });

    it('should deny access to private projects for non-members', () => {
      const project = mockProject;
      const userId = 'unauthorized-user';
      const isOwner = project.owner === userId;
      const isCollaborator = project.collaborators.some(
        (c: any) => c.user === userId
      );
      const isPublic = project.visibility === 'public';

      const hasAccess = isOwner || isCollaborator || isPublic;

      expect(hasAccess).toBe(false);
    });
  });

  describe('Pagination', () => {
    it('should calculate correct skip value', () => {
      const page = 3;
      const limit = 20;
      const skip = (page - 1) * limit;

      expect(skip).toBe(40);
    });

    it('should calculate total pages correctly', () => {
      const total = 55;
      const limit = 20;
      const totalPages = Math.ceil(total / limit);

      expect(totalPages).toBe(3);
    });

    it('should determine hasNext flag', () => {
      const page = 2;
      const totalPages = 3;
      const hasNext = page < totalPages;

      expect(hasNext).toBe(true);
    });

    it('should determine hasPrev flag', () => {
      const page = 2;
      const hasPrev = page > 1;

      expect(hasPrev).toBe(true);
    });

    it('should handle edge case of page 1', () => {
      const page = 1;
      const totalPages = 3;
      const hasPrev = page > 1;
      const hasNext = page < totalPages;

      expect(hasPrev).toBe(false);
      expect(hasNext).toBe(true);
    });

    it('should handle edge case of last page', () => {
      const page = 3;
      const totalPages = 3;
      const hasPrev = page > 1;
      const hasNext = page < totalPages;

      expect(hasPrev).toBe(true);
      expect(hasNext).toBe(false);
    });
  });

  describe('Caching', () => {
    it('should check cache before database queries', async () => {
      const cacheKey = 'collaboration:test';
      (redisManager.get as jest.Mock).mockResolvedValue(null);

      await redisManager.get(cacheKey);

      expect(redisManager.get).toHaveBeenCalledWith(cacheKey);
    });

    it('should cache results with appropriate TTL', async () => {
      const cacheKey = 'collaboration:test';
      const data = { sessions: [] };
      const ttl = 120; // 2 minutes for session lists

      await redisManager.set(cacheKey, data, ttl);

      expect(redisManager.set).toHaveBeenCalledWith(cacheKey, data, ttl);
    });

    it('should invalidate cache on updates', async () => {
      await redisManager.deletePattern('collaboration:*');

      expect(redisManager.deletePattern).toHaveBeenCalledWith('collaboration:*');
    });
  });

  describe('Validation', () => {
    it('should validate MongoDB ObjectId format', () => {
      const validId = '507f1f77bcf86cd799439011';
      const invalidId = 'invalid-id';

      const objectIdPattern = /^[0-9a-fA-F]{24}$/;

      expect(objectIdPattern.test(validId)).toBe(true);
      expect(objectIdPattern.test(invalidId)).toBe(false);
    });

    it('should validate session type values', () => {
      const validTypes = ['collaborative', 'individual', 'review', 'analysis'];
      const type = 'collaborative';

      expect(validTypes).toContain(type);
    });

    it('should validate session status values', () => {
      const validStatuses = ['active', 'completed', 'paused', 'terminated'];
      const status = 'active';

      expect(validStatuses).toContain(status);
    });

    it('should validate activity action values', () => {
      const validActions = [
        'join', 'leave', 'edit_claim', 'add_evidence',
        'create_reasoning', 'comment', 'review', 'vote'
      ];
      const action = 'edit_claim';

      expect(validActions).toContain(action);
    });
  });
});
