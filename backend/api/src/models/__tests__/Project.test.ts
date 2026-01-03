/**
 * Project Model Unit Tests
 * Tests the Project Mongoose schema, validation, and instance methods
 */

import mongoose from 'mongoose';
import Project, { IProject } from '../Project';

describe('Project Model', () => {
  const validProjectData = {
    name: 'Test Project',
    description: 'A test project for unit testing',
    type: 'research' as const,
    owner: new mongoose.Types.ObjectId(),
  };

  describe('Schema Validation', () => {
    it('should require name field', () => {
      const project = new Project({
        ...validProjectData,
        name: undefined,
      });

      const validationError = project.validateSync();
      expect(validationError?.errors.name).toBeDefined();
    });

    it('should require type field', () => {
      const project = new Project({
        ...validProjectData,
        type: undefined,
      });

      const validationError = project.validateSync();
      expect(validationError?.errors.type).toBeDefined();
    });

    it('should require owner field', () => {
      const project = new Project({
        ...validProjectData,
        owner: undefined,
      });

      const validationError = project.validateSync();
      expect(validationError?.errors.owner).toBeDefined();
    });

    it('should enforce name maxlength (100 chars)', () => {
      const project = new Project({
        ...validProjectData,
        name: 'A'.repeat(101),
      });

      const validationError = project.validateSync();
      expect(validationError?.errors.name).toBeDefined();
    });

    it('should enforce description maxlength (1000 chars)', () => {
      const project = new Project({
        ...validProjectData,
        description: 'A'.repeat(1001),
      });

      const validationError = project.validateSync();
      expect(validationError?.errors.description).toBeDefined();
    });

    it('should trim name', () => {
      const project = new Project({
        ...validProjectData,
        name: '  Test Project  ',
      });

      expect(project.name).toBe('Test Project');
    });

    it('should trim description', () => {
      const project = new Project({
        ...validProjectData,
        description: '  A test description  ',
      });

      expect(project.description).toBe('A test description');
    });
  });

  describe('Type Validation', () => {
    const validTypes = ['research', 'education', 'business', 'personal'];

    validTypes.forEach((type) => {
      it(`should accept valid type: ${type}`, () => {
        const project = new Project({
          ...validProjectData,
          type,
        });

        const validationError = project.validateSync();
        expect(validationError?.errors.type).toBeUndefined();
      });
    });

    it('should reject invalid type', () => {
      const project = new Project({
        ...validProjectData,
        type: 'invalid_type',
      });

      const validationError = project.validateSync();
      expect(validationError?.errors.type).toBeDefined();
    });
  });

  describe('Status Validation', () => {
    const validStatuses = ['active', 'completed', 'archived', 'paused'];

    validStatuses.forEach((status) => {
      it(`should accept valid status: ${status}`, () => {
        const project = new Project({
          ...validProjectData,
          status,
        });

        const validationError = project.validateSync();
        expect(validationError?.errors.status).toBeUndefined();
      });
    });

    it('should reject invalid status', () => {
      const project = new Project({
        ...validProjectData,
        status: 'invalid_status',
      });

      const validationError = project.validateSync();
      expect(validationError?.errors.status).toBeDefined();
    });
  });

  describe('Visibility Validation', () => {
    const validVisibilities = ['private', 'team', 'public'];

    validVisibilities.forEach((visibility) => {
      it(`should accept valid visibility: ${visibility}`, () => {
        const project = new Project({
          ...validProjectData,
          visibility,
        });

        const validationError = project.validateSync();
        expect(validationError?.errors.visibility).toBeUndefined();
      });
    });

    it('should reject invalid visibility', () => {
      const project = new Project({
        ...validProjectData,
        visibility: 'invalid_visibility',
      });

      const validationError = project.validateSync();
      expect(validationError?.errors.visibility).toBeDefined();
    });
  });

  describe('Default Values', () => {
    it('should default status to active', () => {
      const project = new Project(validProjectData);
      expect(project.status).toBe('active');
    });

    it('should default visibility to private', () => {
      const project = new Project(validProjectData);
      expect(project.visibility).toBe('private');
    });

    it('should default isActive to true', () => {
      const project = new Project(validProjectData);
      expect(project.isActive).toBe(true);
    });

    it('should initialize collaborators as empty array', () => {
      const project = new Project(validProjectData);
      expect(project.collaborators).toEqual([]);
    });

    it('should initialize tags as empty array', () => {
      const project = new Project(validProjectData);
      expect(project.tags).toEqual([]);
    });

    it('should initialize categories as empty array', () => {
      const project = new Project(validProjectData);
      expect(project.categories).toEqual([]);
    });

    it('should initialize documents as empty array', () => {
      const project = new Project(validProjectData);
      expect(project.documents).toEqual([]);
    });

    it('should initialize milestones as empty array', () => {
      const project = new Project(validProjectData);
      expect(project.milestones).toEqual([]);
    });

    it('should set default statistics to zero', () => {
      const project = new Project(validProjectData);
      expect(project.statistics.totalClaims).toBe(0);
      expect(project.statistics.totalEvidence).toBe(0);
      expect(project.statistics.totalReasoningChains).toBe(0);
      expect(project.statistics.totalCollaborators).toBe(0);
      expect(project.statistics.avgClaimQuality).toBe(0);
    });

    it('should set default settings', () => {
      const project = new Project(validProjectData);

      // Claim validation defaults
      expect(project.settings.claimValidation.requireApproval).toBe(false);
      expect(project.settings.claimValidation.minimumConfidence).toBe(0.5);
      expect(project.settings.claimValidation.allowAutoExtraction).toBe(true);

      // Reasoning defaults
      expect(project.settings.reasoning.enableAIGeneration).toBe(true);
      expect(project.settings.reasoning.requireEvidence).toBe(false);
      expect(project.settings.reasoning.allowPublicReview).toBe(false);

      // Collaboration defaults
      expect(project.settings.collaboration.allowComments).toBe(true);
      expect(project.settings.collaboration.allowVersioning).toBe(true);
      expect(project.settings.collaboration.notifyOnChanges).toBe(true);
    });

    it('should set default export settings', () => {
      const project = new Project(validProjectData);
      expect(project.settings.export.allowedFormats).toEqual(['json', 'csv', 'pdf']);
      expect(project.settings.export.includeMetadata).toBe(true);
      expect(project.settings.export.includeVersionHistory).toBe(false);
    });
  });

  describe('Collaborators Validation', () => {
    const validRoles = ['viewer', 'editor', 'admin'];

    validRoles.forEach((role) => {
      it(`should accept valid collaborator role: ${role}`, () => {
        const project = new Project({
          ...validProjectData,
          collaborators: [
            {
              user: new mongoose.Types.ObjectId(),
              role,
              invitedBy: new mongoose.Types.ObjectId(),
            },
          ],
        });

        const validationError = project.validateSync();
        expect(validationError?.errors['collaborators.0.role']).toBeUndefined();
      });
    });

    it('should require user in collaborator', () => {
      const project = new Project({
        ...validProjectData,
        collaborators: [
          {
            role: 'viewer',
            invitedBy: new mongoose.Types.ObjectId(),
          },
        ],
      });

      const validationError = project.validateSync();
      expect(validationError?.errors['collaborators.0.user']).toBeDefined();
    });

    it('should require invitedBy in collaborator', () => {
      const project = new Project({
        ...validProjectData,
        collaborators: [
          {
            user: new mongoose.Types.ObjectId(),
            role: 'viewer',
          },
        ],
      });

      const validationError = project.validateSync();
      expect(validationError?.errors['collaborators.0.invitedBy']).toBeDefined();
    });

    it('should set default permissions based on role', () => {
      const project = new Project({
        ...validProjectData,
        collaborators: [
          {
            user: new mongoose.Types.ObjectId(),
            role: 'viewer',
            invitedBy: new mongoose.Types.ObjectId(),
          },
        ],
      });

      const collaborator = project.collaborators[0];
      expect(collaborator.permissions.canEdit).toBe(false);
      expect(collaborator.permissions.canDelete).toBe(false);
      expect(collaborator.permissions.canInvite).toBe(false);
      expect(collaborator.permissions.canExport).toBe(true);
      expect(collaborator.permissions.canManageSettings).toBe(false);
    });
  });

  describe('Tags and Categories Validation', () => {
    it('should lowercase tags', () => {
      const project = new Project({
        ...validProjectData,
        tags: ['TEST', 'Sample', 'UPPERCASE'],
      });

      expect(project.tags).toEqual(['test', 'sample', 'uppercase']);
    });

    it('should trim tags', () => {
      const project = new Project({
        ...validProjectData,
        tags: ['  test  ', '  sample  '],
      });

      expect(project.tags).toEqual(['test', 'sample']);
    });

    it('should enforce maxlength on tags (30 chars)', () => {
      const project = new Project({
        ...validProjectData,
        tags: ['A'.repeat(31)],
      });

      const validationError = project.validateSync();
      expect(validationError?.errors['tags.0']).toBeDefined();
    });

    it('should enforce maxlength on categories (50 chars)', () => {
      const project = new Project({
        ...validProjectData,
        categories: ['A'.repeat(51)],
      });

      const validationError = project.validateSync();
      expect(validationError?.errors['categories.0']).toBeDefined();
    });
  });

  describe('Settings Validation', () => {
    it('should validate minimumConfidence range (0-1)', () => {
      const project = new Project({
        ...validProjectData,
        settings: {
          claimValidation: {
            minimumConfidence: 1.5, // Invalid
          },
        },
      });

      const validationError = project.validateSync();
      expect(validationError?.errors['settings.claimValidation.minimumConfidence']).toBeDefined();
    });

    it('should accept minimumConfidence at boundaries', () => {
      const project1 = new Project({
        ...validProjectData,
        settings: {
          claimValidation: { minimumConfidence: 0 },
        },
      });

      const project2 = new Project({
        ...validProjectData,
        settings: {
          claimValidation: { minimumConfidence: 1 },
        },
      });

      expect(project1.validateSync()?.errors['settings.claimValidation.minimumConfidence']).toBeUndefined();
      expect(project2.validateSync()?.errors['settings.claimValidation.minimumConfidence']).toBeUndefined();
    });

    it('should validate export allowedFormats enum', () => {
      const project = new Project({
        ...validProjectData,
        settings: {
          export: {
            allowedFormats: ['invalid_format'],
          },
        },
      });

      const validationError = project.validateSync();
      expect(validationError?.errors['settings.export.allowedFormats.0']).toBeDefined();
    });
  });

  describe('Milestones Validation', () => {
    it('should require title in milestone', () => {
      const project = new Project({
        ...validProjectData,
        milestones: [
          {
            description: 'A milestone',
          },
        ],
      });

      const validationError = project.validateSync();
      expect(validationError?.errors['milestones.0.title']).toBeDefined();
    });

    it('should enforce maxlength on milestone title (100 chars)', () => {
      const project = new Project({
        ...validProjectData,
        milestones: [
          {
            title: 'A'.repeat(101),
          },
        ],
      });

      const validationError = project.validateSync();
      expect(validationError?.errors['milestones.0.title']).toBeDefined();
    });

    it('should enforce maxlength on milestone description (500 chars)', () => {
      const project = new Project({
        ...validProjectData,
        milestones: [
          {
            title: 'Test Milestone',
            description: 'A'.repeat(501),
          },
        ],
      });

      const validationError = project.validateSync();
      expect(validationError?.errors['milestones.0.description']).toBeDefined();
    });

    const validMilestoneStatuses = ['pending', 'in-progress', 'completed', 'overdue'];

    validMilestoneStatuses.forEach((status) => {
      it(`should accept valid milestone status: ${status}`, () => {
        const project = new Project({
          ...validProjectData,
          milestones: [
            {
              title: 'Test Milestone',
              status,
            },
          ],
        });

        const validationError = project.validateSync();
        expect(validationError?.errors['milestones.0.status']).toBeUndefined();
      });
    });

    const validMilestonePriorities = ['low', 'medium', 'high', 'critical'];

    validMilestonePriorities.forEach((priority) => {
      it(`should accept valid milestone priority: ${priority}`, () => {
        const project = new Project({
          ...validProjectData,
          milestones: [
            {
              title: 'Test Milestone',
              priority,
            },
          ],
        });

        const validationError = project.validateSync();
        expect(validationError?.errors['milestones.0.priority']).toBeUndefined();
      });
    });

    it('should default milestone status to pending', () => {
      const project = new Project({
        ...validProjectData,
        milestones: [
          {
            title: 'Test Milestone',
          },
        ],
      });

      expect(project.milestones[0].status).toBe('pending');
    });

    it('should default milestone priority to medium', () => {
      const project = new Project({
        ...validProjectData,
        milestones: [
          {
            title: 'Test Milestone',
          },
        ],
      });

      expect(project.milestones[0].priority).toBe('medium');
    });
  });

  describe('Documents Validation', () => {
    it('should require filename in document', () => {
      const project = new Project({
        ...validProjectData,
        documents: [
          {
            originalName: 'test.pdf',
            mimetype: 'application/pdf',
            size: 1024,
            path: '/uploads/test.pdf',
            uploadedBy: new mongoose.Types.ObjectId(),
          },
        ],
      });

      const validationError = project.validateSync();
      expect(validationError?.errors['documents.0.filename']).toBeDefined();
    });

    it('should require all document fields', () => {
      const project = new Project({
        ...validProjectData,
        documents: [
          {
            filename: 'test-uuid.pdf',
            // Missing other required fields
          },
        ],
      });

      const validationError = project.validateSync();
      expect(validationError?.errors['documents.0.originalName']).toBeDefined();
      expect(validationError?.errors['documents.0.mimetype']).toBeDefined();
      expect(validationError?.errors['documents.0.size']).toBeDefined();
      expect(validationError?.errors['documents.0.path']).toBeDefined();
      expect(validationError?.errors['documents.0.uploadedBy']).toBeDefined();
    });

    it('should default document processed to false', () => {
      const project = new Project({
        ...validProjectData,
        documents: [
          {
            filename: 'test-uuid.pdf',
            originalName: 'test.pdf',
            mimetype: 'application/pdf',
            size: 1024,
            path: '/uploads/test.pdf',
            uploadedBy: new mongoose.Types.ObjectId(),
          },
        ],
      });

      expect(project.documents[0].processed).toBe(false);
    });

    it('should default document extractedClaims to 0', () => {
      const project = new Project({
        ...validProjectData,
        documents: [
          {
            filename: 'test-uuid.pdf',
            originalName: 'test.pdf',
            mimetype: 'application/pdf',
            size: 1024,
            path: '/uploads/test.pdf',
            uploadedBy: new mongoose.Types.ObjectId(),
          },
        ],
      });

      expect(project.documents[0].extractedClaims).toBe(0);
    });
  });

  describe('Virtual Properties', () => {
    it('should calculate collaboratorCount correctly', () => {
      const project = new Project({
        ...validProjectData,
        collaborators: [
          {
            user: new mongoose.Types.ObjectId(),
            role: 'viewer',
            invitedBy: new mongoose.Types.ObjectId(),
          },
          {
            user: new mongoose.Types.ObjectId(),
            role: 'editor',
            invitedBy: new mongoose.Types.ObjectId(),
          },
        ],
      });

      // +1 for owner
      expect(project.get('collaboratorCount')).toBe(3);
    });

    it('should return 1 for project with no collaborators (just owner)', () => {
      const project = new Project(validProjectData);
      expect(project.get('collaboratorCount')).toBe(1);
    });

    it('should calculate completionPercentage correctly', () => {
      const project = new Project({
        ...validProjectData,
        workflow: {
          stages: [
            { name: 'Stage 1', order: 1, requirements: [], autoAdvance: false },
            { name: 'Stage 2', order: 2, requirements: [], autoAdvance: false },
            { name: 'Stage 3', order: 3, requirements: [], autoAdvance: false },
            { name: 'Stage 4', order: 4, requirements: [], autoAdvance: false },
          ],
          completedStages: [1, 2],
        },
      });

      expect(project.get('completionPercentage')).toBe(50);
    });

    it('should return 0 for completionPercentage with no stages', () => {
      const project = new Project(validProjectData);
      expect(project.get('completionPercentage')).toBe(0);
    });

    it('should calculate activeMilestones correctly', () => {
      const project = new Project({
        ...validProjectData,
        milestones: [
          { title: 'Milestone 1', status: 'pending' },
          { title: 'Milestone 2', status: 'completed' },
          { title: 'Milestone 3', status: 'in-progress' },
          { title: 'Milestone 4', status: 'overdue' },
        ],
      });

      expect(project.get('activeMilestones')).toBe(3); // pending + in-progress + overdue
    });
  });

  describe('Instance Methods', () => {
    describe('hasPermission', () => {
      it('should return true for owner with any permission', () => {
        const ownerId = new mongoose.Types.ObjectId();
        const project = new Project({
          ...validProjectData,
          owner: ownerId,
        });

        expect(project.hasPermission(ownerId.toString(), 'canEdit')).toBe(true);
        expect(project.hasPermission(ownerId.toString(), 'canDelete')).toBe(true);
        expect(project.hasPermission(ownerId.toString(), 'canInvite')).toBe(true);
        expect(project.hasPermission(ownerId.toString(), 'canManageSettings')).toBe(true);
      });

      it('should check collaborator permissions correctly', () => {
        const collaboratorId = new mongoose.Types.ObjectId();
        const project = new Project({
          ...validProjectData,
          collaborators: [
            {
              user: collaboratorId,
              role: 'editor',
              permissions: {
                canEdit: true,
                canDelete: false,
                canInvite: false,
                canExport: true,
                canManageSettings: false,
              },
              invitedBy: new mongoose.Types.ObjectId(),
            },
          ],
        });

        expect(project.hasPermission(collaboratorId.toString(), 'canEdit')).toBe(true);
        expect(project.hasPermission(collaboratorId.toString(), 'canDelete')).toBe(false);
        expect(project.hasPermission(collaboratorId.toString(), 'canExport')).toBe(true);
      });

      it('should return false for non-collaborator', () => {
        const randomUserId = new mongoose.Types.ObjectId();
        const project = new Project(validProjectData);

        expect(project.hasPermission(randomUserId.toString(), 'canEdit')).toBe(false);
      });

      it('should return false for non-existent permission', () => {
        const collaboratorId = new mongoose.Types.ObjectId();
        const project = new Project({
          ...validProjectData,
          collaborators: [
            {
              user: collaboratorId,
              role: 'viewer',
              permissions: {
                canEdit: false,
                canDelete: false,
                canInvite: false,
                canExport: true,
                canManageSettings: false,
              },
              invitedBy: new mongoose.Types.ObjectId(),
            },
          ],
        });

        expect(project.hasPermission(collaboratorId.toString(), 'nonExistent' as any)).toBe(false);
      });
    });
  });

  describe('Workflow Validation', () => {
    it('should require name in workflow stage', () => {
      const project = new Project({
        ...validProjectData,
        workflow: {
          stages: [
            {
              order: 1,
              requirements: [],
              autoAdvance: false,
            },
          ],
        },
      });

      const validationError = project.validateSync();
      expect(validationError?.errors['workflow.stages.0.name']).toBeDefined();
    });

    it('should require order in workflow stage', () => {
      const project = new Project({
        ...validProjectData,
        workflow: {
          stages: [
            {
              name: 'Stage 1',
              requirements: [],
              autoAdvance: false,
            },
          ],
        },
      });

      const validationError = project.validateSync();
      expect(validationError?.errors['workflow.stages.0.order']).toBeDefined();
    });

    it('should default autoAdvance to false', () => {
      const project = new Project({
        ...validProjectData,
        workflow: {
          stages: [
            {
              name: 'Stage 1',
              order: 1,
              requirements: [],
            },
          ],
        },
      });

      expect(project.workflow.stages[0].autoAdvance).toBe(false);
    });
  });

  describe('Integration Settings', () => {
    it('should require service name in connected services', () => {
      const project = new Project({
        ...validProjectData,
        integration: {
          connectedServices: [
            {
              status: 'active',
            },
          ],
        },
      });

      const validationError = project.validateSync();
      expect(validationError?.errors['integration.connectedServices.0.service']).toBeDefined();
    });

    const validServiceStatuses = ['active', 'inactive', 'error'];

    validServiceStatuses.forEach((status) => {
      it(`should accept valid service status: ${status}`, () => {
        const project = new Project({
          ...validProjectData,
          integration: {
            connectedServices: [
              {
                service: 'google-drive',
                status,
              },
            ],
          },
        });

        const validationError = project.validateSync();
        expect(validationError?.errors['integration.connectedServices.0.status']).toBeUndefined();
      });
    });

    it('should require url in webhook', () => {
      const project = new Project({
        ...validProjectData,
        integration: {
          webhooks: [
            {
              events: ['claim.created'],
              active: true,
            },
          ],
        },
      });

      const validationError = project.validateSync();
      expect(validationError?.errors['integration.webhooks.0.url']).toBeDefined();
    });

    it('should default webhook active to true', () => {
      const project = new Project({
        ...validProjectData,
        integration: {
          webhooks: [
            {
              url: 'https://example.com/webhook',
              events: ['claim.created'],
            },
          ],
        },
      });

      expect(project.integration.webhooks[0].active).toBe(true);
    });
  });

  describe('Template Validation', () => {
    it('should default isTemplate to false', () => {
      const project = new Project(validProjectData);
      expect(project.template?.isTemplate).toBe(false);
    });

    it('should default useCount to 0', () => {
      const project = new Project(validProjectData);
      expect(project.template?.useCount).toBe(0);
    });

    it('should allow setting template properties', () => {
      const project = new Project({
        ...validProjectData,
        template: {
          isTemplate: true,
          templateName: 'Research Template',
          templateDescription: 'A template for research projects',
          useCount: 5,
        },
      });

      expect(project.template?.isTemplate).toBe(true);
      expect(project.template?.templateName).toBe('Research Template');
      expect(project.template?.useCount).toBe(5);
    });
  });

  describe('Schema Indexes', () => {
    it('should have index on owner field', () => {
      const indexes = Project.schema.indexes();
      const ownerIndex = indexes.find((idx) => idx[0].owner !== undefined);
      expect(ownerIndex).toBeDefined();
    });

    it('should have index on type field', () => {
      const indexes = Project.schema.indexes();
      const typeIndex = indexes.find((idx) => idx[0].type !== undefined);
      expect(typeIndex).toBeDefined();
    });

    it('should have index on status field', () => {
      const indexes = Project.schema.indexes();
      const statusIndex = indexes.find((idx) => idx[0].status !== undefined);
      expect(statusIndex).toBeDefined();
    });

    it('should have index on visibility field', () => {
      const indexes = Project.schema.indexes();
      const visibilityIndex = indexes.find((idx) => idx[0].visibility !== undefined);
      expect(visibilityIndex).toBeDefined();
    });

    it('should have index on collaborators.user', () => {
      const indexes = Project.schema.indexes();
      const collaboratorIndex = indexes.find(
        (idx) => idx[0]['collaborators.user'] !== undefined
      );
      expect(collaboratorIndex).toBeDefined();
    });

    it('should have compound index on owner and status', () => {
      const indexes = Project.schema.indexes();
      const compoundIndex = indexes.find(
        (idx) => idx[0].owner !== undefined && idx[0].status !== undefined
      );
      expect(compoundIndex).toBeDefined();
    });
  });

  describe('Statistics Validation', () => {
    it('should validate avgClaimQuality range (0-1)', () => {
      const project = new Project({
        ...validProjectData,
        statistics: {
          avgClaimQuality: 1.5, // Invalid
        },
      });

      const validationError = project.validateSync();
      expect(validationError?.errors['statistics.avgClaimQuality']).toBeDefined();
    });

    it('should accept avgClaimQuality at boundaries', () => {
      const project1 = new Project({
        ...validProjectData,
        statistics: { avgClaimQuality: 0 },
      });

      const project2 = new Project({
        ...validProjectData,
        statistics: { avgClaimQuality: 1 },
      });

      expect(project1.validateSync()?.errors['statistics.avgClaimQuality']).toBeUndefined();
      expect(project2.validateSync()?.errors['statistics.avgClaimQuality']).toBeUndefined();
    });
  });
});
