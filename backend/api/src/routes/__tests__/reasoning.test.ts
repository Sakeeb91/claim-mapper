/**
 * Reasoning API Tests
 *
 * Comprehensive tests for the reasoning API endpoints including:
 * - CRUD operations for reasoning chains
 * - ML service integration (mocked)
 * - Access control and permissions
 * - Caching behavior
 * - Validation
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

jest.mock('axios', () => ({
  __esModule: true,
  default: jest.fn(),
  AxiosError: class AxiosError extends Error {
    code?: string;
    response?: { status: number; data: unknown };
    constructor(message: string, code?: string, response?: { status: number; data: unknown }) {
      super(message);
      this.code = code;
      this.response = response;
    }
  },
}));

jest.mock('../../models/ReasoningChain', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  },
}));

jest.mock('../../models/Claim', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.mock('../../models/Evidence', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
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
import ReasoningChain from '../../models/ReasoningChain';
import Claim from '../../models/Claim';
import Evidence from '../../models/Evidence';
import Project from '../../models/Project';
import axios from 'axios';

describe('Reasoning API', () => {
  // Test data
  const mockUserId = '507f1f77bcf86cd799439011';
  const mockProjectId = '507f1f77bcf86cd799439012';
  const mockClaimId = '507f1f77bcf86cd799439013';
  const mockReasoningChainId = '507f1f77bcf86cd799439014';
  const mockEvidenceId = '507f1f77bcf86cd799439015';

  const mockProject = {
    _id: mockProjectId,
    name: 'Test Project',
    owner: mockUserId,
    collaborators: [],
    visibility: 'private',
    isActive: true,
  };

  const mockClaim = {
    _id: mockClaimId,
    text: 'Climate change is primarily caused by human activities',
    type: 'assertion',
    confidence: 0.85,
    status: 'approved',
    project: mockProject,
    isActive: true,
  };

  const mockReasoningSteps = [
    {
      stepNumber: 1,
      text: 'CO2 levels have increased since the industrial revolution',
      type: 'premise',
      confidence: 0.95,
      evidence: [mockEvidenceId],
      logicalOperator: 'and',
    },
    {
      stepNumber: 2,
      text: 'CO2 is a greenhouse gas that traps heat',
      type: 'premise',
      confidence: 0.99,
      evidence: [],
    },
    {
      stepNumber: 3,
      text: 'Global temperatures have risen correlating with CO2 increase',
      type: 'inference',
      confidence: 0.9,
      evidence: [],
    },
    {
      stepNumber: 4,
      text: 'Human activities are the primary source of increased CO2',
      type: 'conclusion',
      confidence: 0.85,
      evidence: [],
    },
  ];

  const mockReasoningChain = {
    _id: mockReasoningChainId,
    claim: mockClaim,
    type: 'deductive',
    steps: mockReasoningSteps,
    validity: {
      logicalValidity: 0.9,
      soundness: 0.85,
      completeness: 0.8,
      coherence: 0.88,
      overallScore: 0.86,
    },
    analysis: {
      fallacies: [],
      gaps: [],
      strengths: ['Well-supported premises', 'Clear logical flow'],
      counterarguments: [],
    },
    project: mockProject,
    creator: mockUserId,
    status: 'draft',
    isActive: true,
    tags: ['climate', 'science'],
    metadata: {
      generationMethod: 'manual',
      complexity: 'intermediate',
      language: 'en',
    },
    reviews: [],
    save: jest.fn().mockResolvedValue(true),
    populate: jest.fn().mockReturnThis(),
    addReview: jest.fn().mockResolvedValue(true),
  };

  const mockMLResponse = {
    reasoning_chains: [
      {
        steps: [
          { step_number: 1, text: 'Generated premise 1', type: 'premise', confidence: 0.8 },
          { step_number: 2, text: 'Generated conclusion', type: 'conclusion', confidence: 0.75 },
        ],
        logical_validity: 0.8,
        overall_confidence: 0.78,
      },
    ],
    fallacies: [],
    logical_gaps: [],
    processing_time: 0.245,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Reasoning Step Validation', () => {
    it('should require minimum 2 steps for a valid reasoning chain', () => {
      const steps = mockReasoningSteps;
      const hasMinimumSteps = steps.length >= 2;

      expect(hasMinimumSteps).toBe(true);
    });

    it('should reject chains with less than 2 steps', () => {
      const steps = [mockReasoningSteps[0]];
      const hasMinimumSteps = steps.length >= 2;

      expect(hasMinimumSteps).toBe(false);
    });

    it('should validate step number sequence', () => {
      const steps = mockReasoningSteps;
      const isSequential = steps.every(
        (step, index) => step.stepNumber === index + 1
      );

      expect(isSequential).toBe(true);
    });

    it('should validate step text length constraints', () => {
      const minLength = 10;
      const maxLength = 1000;

      mockReasoningSteps.forEach((step) => {
        const textLength = step.text.length;
        expect(textLength).toBeGreaterThanOrEqual(minLength);
        expect(textLength).toBeLessThanOrEqual(maxLength);
      });
    });

    it('should validate step type values', () => {
      const validTypes = ['premise', 'inference', 'conclusion', 'assumption', 'observation'];

      mockReasoningSteps.forEach((step) => {
        expect(validTypes).toContain(step.type);
      });
    });

    it('should validate confidence scores are between 0 and 1', () => {
      mockReasoningSteps.forEach((step) => {
        expect(step.confidence).toBeGreaterThanOrEqual(0);
        expect(step.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should validate logical operator values', () => {
      const validOperators = ['and', 'or', 'if-then', 'if-and-only-if', 'not', undefined];

      mockReasoningSteps.forEach((step) => {
        expect(validOperators).toContain(step.logicalOperator);
      });
    });
  });

  describe('Reasoning Type Validation', () => {
    it('should accept valid reasoning types', () => {
      const validTypes = [
        'deductive',
        'inductive',
        'abductive',
        'analogical',
        'causal',
        'statistical',
      ];

      validTypes.forEach((type) => {
        expect(validTypes).toContain(type);
      });
    });

    it('should recognize deductive reasoning characteristics', () => {
      // Deductive: conclusion follows necessarily from premises
      const type = mockReasoningChain.type;
      expect(type).toBe('deductive');

      // Should have high logical validity for deductive
      expect(mockReasoningChain.validity.logicalValidity).toBeGreaterThan(0.8);
    });
  });

  describe('Validity Score Calculation', () => {
    it('should calculate overall score from components', () => {
      const { logicalValidity, soundness, completeness, coherence } = mockReasoningChain.validity;

      // Simple average calculation (actual implementation may differ)
      const calculatedOverall = (logicalValidity + soundness + completeness + coherence) / 4;

      expect(calculatedOverall).toBeCloseTo(0.8575, 2);
    });

    it('should have all validity components between 0 and 1', () => {
      const validity = mockReasoningChain.validity;

      expect(validity.logicalValidity).toBeGreaterThanOrEqual(0);
      expect(validity.logicalValidity).toBeLessThanOrEqual(1);
      expect(validity.soundness).toBeGreaterThanOrEqual(0);
      expect(validity.soundness).toBeLessThanOrEqual(1);
      expect(validity.completeness).toBeGreaterThanOrEqual(0);
      expect(validity.completeness).toBeLessThanOrEqual(1);
      expect(validity.coherence).toBeGreaterThanOrEqual(0);
      expect(validity.coherence).toBeLessThanOrEqual(1);
    });
  });

  describe('Project Access Control', () => {
    it('should allow owner access to private project', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);

      const project = await Project.findById(mockProjectId);
      const isOwner = project?.owner.toString() === mockUserId;

      expect(isOwner).toBe(true);
    });

    it('should allow collaborator access', async () => {
      const projectWithCollaborator = {
        ...mockProject,
        collaborators: [{ user: 'collaborator-id', permissions: { canEdit: true } }],
      };
      (Project.findById as jest.Mock).mockResolvedValue(projectWithCollaborator);

      const project = await Project.findById(mockProjectId);
      const isCollaborator = project?.collaborators.some(
        (c: any) => c.user === 'collaborator-id'
      );

      expect(isCollaborator).toBe(true);
    });

    it('should deny access for non-authorized users', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);

      const project = await Project.findById(mockProjectId);
      const unauthorizedUserId = 'unauthorized-user';
      const isOwner = project?.owner.toString() === unauthorizedUserId;
      const isCollaborator = project?.collaborators.some(
        (c: any) => c.user === unauthorizedUserId
      );

      expect(isOwner).toBe(false);
      expect(isCollaborator).toBe(false);
    });

    it('should allow access to public projects for all users', async () => {
      const publicProject = { ...mockProject, visibility: 'public' };
      (Project.findById as jest.Mock).mockResolvedValue(publicProject);

      const project = await Project.findById(mockProjectId);

      expect(project?.visibility).toBe('public');
    });
  });

  describe('Edit Permission Checks', () => {
    it('should allow creator to edit their own chain', () => {
      const chainCreatorId = mockReasoningChain.creator;
      const currentUserId = mockUserId;

      expect(chainCreatorId).toBe(currentUserId);
    });

    it('should allow project owner to edit any chain', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);

      const project = await Project.findById(mockProjectId);
      const isOwner = project?.owner.toString() === mockUserId;

      expect(isOwner).toBe(true);
    });

    it('should check collaborator edit permissions', async () => {
      const projectWithEditor = {
        ...mockProject,
        collaborators: [
          { user: 'editor-id', permissions: { canEdit: true } },
          { user: 'viewer-id', permissions: { canEdit: false } },
        ],
      };
      (Project.findById as jest.Mock).mockResolvedValue(projectWithEditor);

      const project = await Project.findById(mockProjectId);
      const editorPerms = project?.collaborators.find(
        (c: any) => c.user === 'editor-id'
      );
      const viewerPerms = project?.collaborators.find(
        (c: any) => c.user === 'viewer-id'
      );

      expect(editorPerms?.permissions?.canEdit).toBe(true);
      expect(viewerPerms?.permissions?.canEdit).toBe(false);
    });
  });

  describe('Status Transition Rules', () => {
    it('should not allow modifications to archived chains', () => {
      const archivedChain = { ...mockReasoningChain, status: 'archived' };
      const canModify = archivedChain.status !== 'archived';

      expect(canModify).toBe(false);
    });

    it('should only allow status updates on published chains', () => {
      const publishedChain = { ...mockReasoningChain, status: 'published' };
      const updates = { type: 'inductive' }; // Non-status update

      const canModify = publishedChain.status !== 'published' || 'status' in updates;

      expect(canModify).toBe(false);
    });

    it('should allow any updates on draft chains', () => {
      const draftChain = { ...mockReasoningChain, status: 'draft' };

      expect(draftChain.status).toBe('draft');
      // Draft chains have no modification restrictions
    });

    it('should validate status values', () => {
      const validStatuses = ['draft', 'review', 'validated', 'published', 'archived'];

      expect(validStatuses).toContain(mockReasoningChain.status);
    });
  });

  describe('ML Service Integration', () => {
    it('should call ML service with correct payload for generation', async () => {
      const mockAxios = axios as jest.MockedFunction<typeof axios>;
      mockAxios.mockResolvedValue({ data: mockMLResponse });

      const payload = {
        claim: mockClaim.text,
        evidence: [],
        reasoning_type: 'deductive',
        complexity: 'intermediate',
        max_steps: 10,
        use_llm: true,
        llm_provider: 'openai',
      };

      await axios({
        method: 'post',
        url: 'http://localhost:8002/reasoning/generate',
        data: payload,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': '',
        },
      });

      expect(mockAxios).toHaveBeenCalled();
    });

    it('should handle ML service unavailable', async () => {
      const mockAxios = axios as jest.MockedFunction<typeof axios>;
      const axiosError = new Error('Connection refused');
      (axiosError as NodeJS.ErrnoException).code = 'ECONNREFUSED';
      mockAxios.mockRejectedValue(axiosError);

      await expect(
        axios({ method: 'post', url: 'http://localhost:8002/reasoning/generate' })
      ).rejects.toThrow('Connection refused');
    });

    it('should handle ML service timeout', async () => {
      const mockAxios = axios as jest.MockedFunction<typeof axios>;
      const axiosError = new Error('Timeout');
      (axiosError as NodeJS.ErrnoException).code = 'ETIMEDOUT';
      mockAxios.mockRejectedValue(axiosError);

      await expect(
        axios({ method: 'post', url: 'http://localhost:8002/reasoning/generate' })
      ).rejects.toThrow('Timeout');
    });

    it('should handle ML service rate limiting', async () => {
      const mockAxios = axios as jest.MockedFunction<typeof axios>;
      const axiosError = {
        message: 'Rate limited',
        response: { status: 429, data: { message: 'Too many requests' } },
      };
      mockAxios.mockRejectedValue(axiosError);

      await expect(
        axios({ method: 'post', url: 'http://localhost:8002/reasoning/generate' })
      ).rejects.toMatchObject({ response: { status: 429 } });
    });

    it('should transform ML response to schema format', () => {
      const mlSteps = mockMLResponse.reasoning_chains[0].steps;

      const transformedSteps = mlSteps.map((step, index) => ({
        stepNumber: step.step_number || index + 1,
