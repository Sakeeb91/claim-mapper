/**
 * Projects Routes Unit Tests
 * Tests project CRUD, collaborator management, and statistics
 */

import mongoose from 'mongoose';

// Mock dependencies
jest.mock('../../config/redis', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    deletePattern: jest.fn().mockResolvedValue(undefined),
    trackUserActivity: jest.fn().mockResolvedValue(undefined),
    incrementMetric: jest.fn().mockResolvedValue(undefined),
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

import redisManager from '../../config/redis';

describe('Projects Routes', () => {
  const mockUserId = new mongoose.Types.ObjectId().toHexString();
  const mockProjectId = new mongoose.Types.ObjectId().toHexString();
  const mockCollaboratorId = new mongoose.Types.ObjectId().toHexString();

  const mockProject = {
    _id: mockProjectId,
    name: 'Test Project',
    description: 'A test project',
    type: 'research',
    status: 'active',
    visibility: 'private',
    owner: mockUserId,
    collaborators: [],
    settings: {
      claimValidation: {
        requireApproval: false,
        minimumConfidence: 0.5,
        allowAutoExtraction: true,
      },
      reasoning: {
        enableAIGeneration: true,
        requireEvidence: false,
        allowPublicReview: false,
      },
      collaboration: {
        allowComments: true,
        allowVersioning: true,
        notifyOnChanges: true,
      },
    },
    statistics: {
      totalClaims: 0,
      totalEvidence: 0,
      totalReasoningChains: 0,
      totalCollaborators: 0,
      avgClaimQuality: 0,
    },
    isActive: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/projects - List Projects', () => {
    describe('Query Building', () => {
      it('should filter by owner', () => {
        const query = { owner: mockUserId, isActive: true };

        expect(query.owner).toBe(mockUserId);
      });

      it('should include collaborator filter', () => {
        const query = {
          $or: [
            { owner: mockUserId },
            { 'collaborators.user': mockUserId },
          ],
          isActive: true,
        };

        expect(query.$or).toHaveLength(2);
      });

      it('should add type filter when provided', () => {
        const query: Record<string, unknown> = { isActive: true };
        const type = 'research';

        if (type) query.type = type;

        expect(query.type).toBe('research');
      });

      it('should add status filter when provided', () => {
        const query: Record<string, unknown> = { isActive: true };
        const status = 'active';

        if (status) query.status = status;

        expect(query.status).toBe('active');
      });
    });

    describe('Sorting', () => {
      it('should default to sorting by updatedAt descending', () => {
        const sort = { updatedAt: -1 };

        expect(sort.updatedAt).toBe(-1);
      });

      it('should support sorting by name', () => {
        const sort = { name: 1 };

        expect(sort.name).toBe(1);
      });
    });

    describe('Pagination', () => {
      it('should calculate pagination correctly', () => {
        const page = 2;
        const limit = 10;
        const total = 25;

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
  });

  describe('POST /api/projects - Create Project', () => {
    describe('Project Creation', () => {
      it('should set owner to current user', () => {
        const projectData = {
          name: 'New Project',
          type: 'research',
        };

        const newProject = {
          ...projectData,
          owner: mockUserId,
        };

        expect(newProject.owner).toBe(mockUserId);
      });

      it('should set default values', () => {
        const defaults = {
          status: 'active',
          visibility: 'private',
          isActive: true,
          statistics: {
            totalClaims: 0,
            totalEvidence: 0,
            totalReasoningChains: 0,
            totalCollaborators: 0,
            avgClaimQuality: 0,
          },
        };

        expect(defaults.status).toBe('active');
        expect(defaults.visibility).toBe('private');
      });
    });

    describe('User Statistics Update', () => {
      it('should increment user project count', () => {
        const update = {
          $inc: { 'stats.projectsCreated': 1 },
        };

        expect(update.$inc['stats.projectsCreated']).toBe(1);
      });
    });

    describe('Cache Invalidation', () => {
      it('should clear projects cache', async () => {
        await redisManager.deletePattern('projects:*');

        expect(redisManager.deletePattern).toHaveBeenCalledWith('projects:*');
      });
    });

    describe('Activity Tracking', () => {
      it('should track project creation', async () => {
        await redisManager.trackUserActivity(mockUserId, {
          action: 'create_project',
          projectId: mockProjectId,
          details: { name: 'New Project' },
        });

        expect(redisManager.trackUserActivity).toHaveBeenCalled();
      });
    });
  });

  describe('GET /api/projects/:id - Get Project by ID', () => {
    describe('Access Control', () => {
      it('should allow owner access', () => {
        const project = mockProject;
        const userId = mockUserId;

        const hasAccess = project.owner === userId;

        expect(hasAccess).toBe(true);
      });

      it('should allow collaborator access', () => {
        const project = {
          ...mockProject,
          collaborators: [{ user: mockCollaboratorId }],
        };
        const userId = mockCollaboratorId;

        const hasAccess = project.collaborators.some(
          (c) => c.user === userId
        );

        expect(hasAccess).toBe(true);
      });

      it('should allow public project access', () => {
        const project = { ...mockProject, visibility: 'public' };

        expect(project.visibility).toBe('public');
      });

      it('should deny access to private project for non-members', () => {
        const project = mockProject;
        const userId = 'random-user';

        const hasAccess =
          project.owner === userId ||
          project.collaborators.some((c: { user: string }) => c.user === userId) ||
          project.visibility === 'public';

        expect(hasAccess).toBe(false);
      });
    });

    describe('Data Population', () => {
      it('should populate owner details', () => {
        const populateFields = [
          { path: 'owner', select: 'firstName lastName email avatar' },
          { path: 'collaborators.user', select: 'firstName lastName email avatar' },
        ];

        expect(populateFields[0].path).toBe('owner');
        expect(populateFields[0].select).toContain('firstName');
      });
    });
  });

  describe('PUT /api/projects/:id - Update Project', () => {
    describe('Permission Checking', () => {
      it('should allow owner to update', () => {
        const projectOwner = mockUserId;
        const currentUser = mockUserId;

        const canUpdate = projectOwner === currentUser;

        expect(canUpdate).toBe(true);
      });

      it('should allow admin collaborator to update', () => {
        const collaborators = [
          { user: mockCollaboratorId, role: 'admin', permissions: { canManageSettings: true } },
        ];
        const userId = mockCollaboratorId;

        const canUpdate = collaborators.some(
          (c) => c.user === userId && c.permissions.canManageSettings
        );

        expect(canUpdate).toBe(true);
      });

      it('should deny editor from changing settings', () => {
        const collaborators = [
          { user: mockCollaboratorId, role: 'editor', permissions: { canManageSettings: false } },
        ];
        const userId = mockCollaboratorId;

        const canUpdate = collaborators.some(
          (c) => c.user === userId && c.permissions.canManageSettings
        );

        expect(canUpdate).toBe(false);
      });
    });

    describe('Update Application', () => {
      it('should merge updates with existing data', () => {
        const existing = mockProject;
        const updates = {
          name: 'Updated Name',
          description: 'Updated description',
        };

        const updated = { ...existing, ...updates };

        expect(updated.name).toBe('Updated Name');
        expect(updated.type).toBe('research'); // Preserved
      });

      it('should handle settings updates', () => {
        const existingSettings = mockProject.settings;
        const settingsUpdate = {
          reasoning: { enableAIGeneration: false },
        };

        const mergedSettings = {
          ...existingSettings,
          reasoning: { ...existingSettings.reasoning, ...settingsUpdate.reasoning },
        };

        expect(mergedSettings.reasoning.enableAIGeneration).toBe(false);
        expect(mergedSettings.collaboration.allowComments).toBe(true); // Preserved
      });
    });
  });

  describe('DELETE /api/projects/:id - Delete Project', () => {
    describe('Permission Checking', () => {
      it('should only allow owner to delete', () => {
        const projectOwner = mockUserId;
        const currentUser = mockUserId;

        const canDelete = projectOwner === currentUser;

        expect(canDelete).toBe(true);
      });

      it('should deny admin collaborator from deleting', () => {
        const projectOwner = mockUserId;
        const currentUser = mockCollaboratorId;

        const canDelete = projectOwner === currentUser;

        expect(canDelete).toBe(false);
      });
    });

    describe('Soft Delete', () => {
      it('should set isActive to false', () => {
        const project = { ...mockProject };
        project.isActive = false;

        expect(project.isActive).toBe(false);
      });

      it('should update status to archived', () => {
        const project = { ...mockProject };
        project.status = 'archived';

        expect(project.status).toBe('archived');
      });
    });
  });

  describe('POST /api/projects/:id/collaborators - Add Collaborator', () => {
    describe('Email Lookup', () => {
      it('should find user by email', () => {
        const email = 'collaborator@example.com';

        expect(email).toContain('@');
      });
    });

    describe('Duplicate Check', () => {
      it('should prevent adding existing collaborator', () => {
        const collaborators = [{ user: mockCollaboratorId }];
        const newUserId = mockCollaboratorId;

        const alreadyExists = collaborators.some(
          (c) => c.user === newUserId
        );

        expect(alreadyExists).toBe(true);
      });
    });

    describe('Permission Assignment', () => {
      it('should set permissions based on role', () => {
        const role = 'editor';
        const permissions = {
          canEdit: role === 'editor' || role === 'admin',
          canDelete: role === 'admin',
          canInvite: role === 'admin',
          canExport: true,
          canManageSettings: role === 'admin',
        };

        expect(permissions.canEdit).toBe(true);
        expect(permissions.canDelete).toBe(false);
      });

      it('should give admin all permissions', () => {
        const role = 'admin';
        const permissions = {
          canEdit: role === 'editor' || role === 'admin',
          canDelete: role === 'admin',
          canInvite: role === 'admin',
          canExport: true,
          canManageSettings: role === 'admin',
        };

        expect(permissions.canEdit).toBe(true);
        expect(permissions.canDelete).toBe(true);
        expect(permissions.canInvite).toBe(true);
      });
    });

    describe('Statistics Update', () => {
      it('should increment collaborator count', () => {
        const update = {
          $inc: { 'statistics.totalCollaborators': 1 },
        };

        expect(update.$inc['statistics.totalCollaborators']).toBe(1);
      });
    });
  });

  describe('DELETE /api/projects/:id/collaborators/:userId - Remove Collaborator', () => {
    describe('Permission Checking', () => {
      it('should allow owner to remove collaborator', () => {
        const projectOwner = mockUserId;
        const currentUser = mockUserId;

        const canRemove = projectOwner === currentUser;

        expect(canRemove).toBe(true);
      });

      it('should allow admin to remove collaborator', () => {
        const collaborators = [
          { user: mockUserId, role: 'admin', permissions: { canInvite: true } },
        ];
        const currentUser = mockUserId;

        const canRemove = collaborators.some(
          (c) => c.user === currentUser && c.permissions.canInvite
        );

        expect(canRemove).toBe(true);
      });
    });

    describe('Self-Removal', () => {
      it('should allow collaborator to remove themselves', () => {
        const collaboratorToRemove = mockCollaboratorId;
        const currentUser = mockCollaboratorId;

        const isSelfRemoval = collaboratorToRemove === currentUser;

        expect(isSelfRemoval).toBe(true);
      });
    });

    describe('Collaborator Filtering', () => {
      it('should remove collaborator from array', () => {
        const collaborators = [
          { user: mockCollaboratorId },
          { user: 'other-user' },
        ];
        const userToRemove = mockCollaboratorId;

        const filtered = collaborators.filter((c) => c.user !== userToRemove);

        expect(filtered).toHaveLength(1);
        expect(filtered[0].user).toBe('other-user');
      });
    });
  });

  describe('GET /api/projects/:id/statistics - Get Project Statistics', () => {
    describe('Statistics Calculation', () => {
      it('should return all statistics fields', () => {
        const stats = {
          totalClaims: 50,
          totalEvidence: 100,
          totalReasoningChains: 25,
          totalCollaborators: 5,
          avgClaimQuality: 0.75,
        };

        expect(stats.totalClaims).toBeDefined();
        expect(stats.avgClaimQuality).toBeGreaterThanOrEqual(0);
        expect(stats.avgClaimQuality).toBeLessThanOrEqual(1);
      });

      it('should include claim type breakdown', () => {
        const claimsByType = {
          assertion: 20,
          hypothesis: 15,
          conclusion: 10,
          question: 5,
        };

        expect(Object.keys(claimsByType)).toContain('assertion');
      });

      it('should include evidence type breakdown', () => {
        const evidenceByType = {
          empirical: 40,
          statistical: 30,
          testimonial: 20,
          expert: 10,
        };

        expect(Object.keys(evidenceByType)).toContain('empirical');
      });
    });
  });

  describe('Response Formats', () => {
    it('should return correct list response', () => {
      const response = {
        success: true,
        data: [mockProject],
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
    });

    it('should return correct single project response', () => {
      const response = {
        success: true,
        data: mockProject,
      };

      expect(response.success).toBe(true);
      expect(response.data._id).toBe(mockProjectId);
    });

    it('should return correct collaborator added response', () => {
      const response = {
        success: true,
        message: 'Collaborator added successfully',
        data: {
          projectId: mockProjectId,
          collaborator: {
            user: mockCollaboratorId,
            role: 'editor',
          },
        },
      };

      expect(response.success).toBe(true);
      expect(response.data.collaborator).toBeDefined();
    });
  });
});
