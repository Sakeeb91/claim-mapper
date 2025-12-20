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
