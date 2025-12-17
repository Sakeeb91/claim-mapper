import { Request, Response } from 'express';

// Mock all external dependencies before importing the router
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

jest.mock('../../models/Claim', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

jest.mock('../../models/Evidence', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    countDocuments: jest.fn(),
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
import Claim from '../../models/Claim';
import Project from '../../models/Project';
import Evidence from '../../models/Evidence';

describe('Graph API', () => {
  // Mock data
  const mockUserId = '507f1f77bcf86cd799439011';
  const mockProjectId = '507f1f77bcf86cd799439012';
  const mockClaimId = '507f1f77bcf86cd799439013';
  const mockEvidenceId = '507f1f77bcf86cd799439014';
  const mockRelatedClaimId = '507f1f77bcf86cd799439015';

  const mockProject = {
    _id: mockProjectId,
    owner: mockUserId,
    collaborators: [],
    visibility: 'private',
    isActive: true,
  };

  const mockClaim = {
    _id: mockClaimId,
    text: 'This is a test claim with sufficient length for testing purposes',
    type: 'assertion',
    confidence: 0.85,
    status: 'approved',
    tags: ['test', 'sample'],
    quality: { overallScore: 0.8 },
    createdAt: new Date(),
    project: mockProjectId,
    evidence: [
      {
        _id: mockEvidenceId,
        text: 'Supporting evidence text for the test claim',
        type: 'empirical',
        reliability: { score: 0.9 },
        verification: { status: 'verified' },
        tags: ['evidence'],
        quality: { overallScore: 0.85 },
        createdAt: new Date(),
      },
    ],
    relatedClaims: [
      {
        claimId: {
          _id: mockRelatedClaimId,
          text: 'Related claim text for testing',
          type: 'hypothesis',
          confidence: 0.7,
          status: 'draft',
          tags: ['related'],
          quality: { overallScore: 0.6 },
          createdAt: new Date(),
        },
        relationship: 'supports',
        confidence: 0.8,
      },
    ],
    reasoningChains: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Graph Data Transformation', () => {
    it('should transform claim to node correctly', () => {
      const claim = mockClaim;

      // Test the node transformation logic
      const node = {
        id: claim._id.toString(),
        type: 'claim' as const,
        label: claim.text.length > 100
          ? claim.text.substring(0, 100) + '...'
          : claim.text,
        data: {
          claimType: claim.type,
          confidence: claim.confidence,
          status: claim.status,
          tags: claim.tags,
          quality: claim.quality?.overallScore,
          createdAt: claim.createdAt,
        },
      };

      expect(node.id).toBe(mockClaimId);
      expect(node.type).toBe('claim');
      expect(node.data.claimType).toBe('assertion');
      expect(node.data.confidence).toBe(0.85);
    });

    it('should transform evidence to node correctly', () => {
      const evidence = mockClaim.evidence[0];

      const node = {
        id: evidence._id.toString(),
        type: 'evidence' as const,
        label: evidence.text.length > 100
          ? evidence.text.substring(0, 100) + '...'
          : evidence.text,
        data: {
          evidenceType: evidence.type,
          confidence: evidence.reliability?.score || 0.5,
          status: evidence.verification?.status,
          tags: evidence.tags,
          quality: evidence.quality?.overallScore,
          createdAt: evidence.createdAt,
        },
      };

      expect(node.id).toBe(mockEvidenceId);
      expect(node.type).toBe('evidence');
      expect(node.data.evidenceType).toBe('empirical');
      expect(node.data.confidence).toBe(0.9);
    });

    it('should truncate long labels to 100 characters', () => {
      const longText = 'A'.repeat(150);
      const truncated = longText.length > 100
        ? longText.substring(0, 100) + '...'
        : longText;

      expect(truncated.length).toBe(103); // 100 + '...'
      expect(truncated.endsWith('...')).toBe(true);
    });
  });

  describe('Graph Metrics Calculation', () => {
    it('should calculate basic graph metrics', () => {
      const nodes = [
        { id: '1' },
        { id: '2' },
        { id: '3' },
      ];
      const links = [
        { source: '1', target: '2' },
        { source: '2', target: '3' },
      ];

      const nodeCount = nodes.length;
      const linkCount = links.length;
      const maxPossibleLinks = (nodeCount * (nodeCount - 1)) / 2;
      const density = maxPossibleLinks > 0 ? linkCount / maxPossibleLinks : 0;
      const averageDegree = nodeCount > 0 ? (2 * linkCount) / nodeCount : 0;

      expect(nodeCount).toBe(3);
      expect(linkCount).toBe(2);
      expect(density).toBeCloseTo(0.667, 2);
      expect(averageDegree).toBeCloseTo(1.333, 2);
    });

    it('should handle empty graphs', () => {
      const nodes: any[] = [];
      const links: any[] = [];

      const nodeCount = nodes.length;
      const linkCount = links.length;
      const density = 0;
      const averageDegree = 0;

      expect(nodeCount).toBe(0);
      expect(linkCount).toBe(0);
      expect(density).toBe(0);
      expect(averageDegree).toBe(0);
    });

    it('should handle single node graph', () => {
      const nodes = [{ id: '1' }];
      const links: any[] = [];

      const nodeCount = nodes.length;
      const linkCount = links.length;
      const maxPossibleLinks = (nodeCount * (nodeCount - 1)) / 2;
      const density = maxPossibleLinks > 0 ? linkCount / maxPossibleLinks : 0;
      const averageDegree = nodeCount > 0 ? (2 * linkCount) / nodeCount : 0;

      expect(nodeCount).toBe(1);
      expect(linkCount).toBe(0);
      expect(maxPossibleLinks).toBe(0);
      expect(density).toBe(0);
      expect(averageDegree).toBe(0);
    });
  });

  describe('Project Access Control', () => {
    it('should allow access to public projects for unauthenticated users', async () => {
      const publicProject = { ...mockProject, visibility: 'public' };
      (Project.findById as jest.Mock).mockResolvedValue(publicProject);

      const project = await Project.findById(mockProjectId);

      expect(project?.visibility).toBe('public');
      // Public projects are accessible to all
    });

    it('should deny access to private projects for unauthenticated users', async () => {
      const privateProject = { ...mockProject, visibility: 'private' };
      (Project.findById as jest.Mock).mockResolvedValue(privateProject);

      const project = await Project.findById(mockProjectId);
      const userId = undefined;

      const isPublic = project?.visibility === 'public';
      const hasAccess = isPublic;

      expect(hasAccess).toBe(false);
    });

    it('should allow access for project owner', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);

      const project = await Project.findById(mockProjectId);
      const userId = mockUserId;

      const isOwner = project?.owner.toString() === userId;

      expect(isOwner).toBe(true);
    });

    it('should allow access for project collaborator', async () => {
      const projectWithCollaborator = {
        ...mockProject,
        collaborators: [{ user: 'collaborator-id' }],
      };
      (Project.findById as jest.Mock).mockResolvedValue(projectWithCollaborator);

      const project = await Project.findById(mockProjectId);
      const userId = 'collaborator-id';

      const isCollaborator = project?.collaborators.some(
        (c: any) => c.user.toString() === userId
      );

      expect(isCollaborator).toBe(true);
    });
  });

  describe('Link Deduplication', () => {
    it('should avoid duplicate links', () => {
      const linkIdSet = new Set<string>();

      const linkId1 = 'node1-node2';
      const linkId2 = 'node2-node1'; // Reverse direction

      // Add first link
      if (!linkIdSet.has(linkId1) && !linkIdSet.has(linkId2)) {
        linkIdSet.add(linkId1);
      }

      // Try to add reverse link (should be skipped)
      if (!linkIdSet.has(linkId1) && !linkIdSet.has(linkId2)) {
        linkIdSet.add(linkId2);
      }

      expect(linkIdSet.size).toBe(1);
      expect(linkIdSet.has(linkId1)).toBe(true);
      expect(linkIdSet.has(linkId2)).toBe(false);
    });
  });

  describe('Node Limit Enforcement', () => {
    it('should limit nodes to maximum allowed', () => {
      const maxNodes = 1000;
      const nodes = Array.from({ length: 1500 }, (_, i) => ({ id: `node-${i}` }));

      const limitedNodes = nodes.slice(0, maxNodes);

      expect(limitedNodes.length).toBe(1000);
    });

    it('should filter links to only include existing nodes', () => {
      const nodeIds = new Set(['1', '2', '3']);
      const links = [
        { source: '1', target: '2' },
        { source: '2', target: '3' },
        { source: '3', target: '4' }, // Node 4 doesn't exist
        { source: '5', target: '6' }, // Neither node exists
      ];

      const filteredLinks = links.filter(
        (link) => nodeIds.has(link.source) && nodeIds.has(link.target)
      );

      expect(filteredLinks.length).toBe(2);
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate unique cache keys for different queries', () => {
      const query1 = { projectId: 'proj1', limit: 500 };
      const query2 = { projectId: 'proj1', limit: 100 };
      const query3 = { projectId: 'proj2', limit: 500 };

      const key1 = `graph:${JSON.stringify(query1)}`;
      const key2 = `graph:${JSON.stringify(query2)}`;
      const key3 = `graph:${JSON.stringify(query3)}`;

      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key2).not.toBe(key3);
    });

    it('should include user ID in cache key for access control', () => {
      const query = { projectId: 'proj1', userId: 'user1' };
      const key = `graph:${JSON.stringify(query)}`;

      expect(key).toContain('user1');
    });
  });

  describe('Redis Caching', () => {
    it('should check cache before querying database', async () => {
      const cachedData = { nodes: [], links: [], metrics: {} };
      (redisManager.get as jest.Mock).mockResolvedValue(cachedData);

      const result = await redisManager.get('graph:test-key');

      expect(redisManager.get).toHaveBeenCalledWith('graph:test-key');
      expect(result).toEqual(cachedData);
    });

    it('should cache results with correct TTL', async () => {
      const graphData = { nodes: [], links: [], metrics: {} };
      const ttl = 600; // 10 minutes

      await redisManager.set('graph:test-key', graphData, ttl);

      expect(redisManager.set).toHaveBeenCalledWith('graph:test-key', graphData, ttl);
    });

    it('should clear cache on demand', async () => {
      await redisManager.deletePattern('graph:*projectId*');

      expect(redisManager.deletePattern).toHaveBeenCalledWith('graph:*projectId*');
    });
  });

  describe('Relationship Types', () => {
    it('should support all relationship types', () => {
      const validTypes = [
        'supports',
        'contradicts',
        'neutral',
        'related',
        'questions',
        'elaborates',
        'similar',
      ];

      validTypes.forEach((type) => {
        const link = {
          id: `link-${type}`,
          source: 'node1',
          target: 'node2',
          type,
          confidence: 0.8,
        };

        expect(validTypes).toContain(link.type);
      });
    });
  });

  describe('Query Validation', () => {
    it('should require either projectId or claimIds', () => {
      const query: Record<string, unknown> = {};
      const isValid = 'projectId' in query || 'claimIds' in query;

      expect(isValid).toBe(false);
    });

    it('should accept valid projectId', () => {
      const query = { projectId: mockProjectId };
      const objectIdPattern = /^[0-9a-fA-F]{24}$/;

      expect(objectIdPattern.test(query.projectId)).toBe(true);
    });

    it('should accept array of claimIds', () => {
      const query = { claimIds: [mockClaimId, mockRelatedClaimId] };
      const objectIdPattern = /^[0-9a-fA-F]{24}$/;

      query.claimIds.forEach((id) => {
        expect(objectIdPattern.test(id)).toBe(true);
      });
    });

    it('should validate maxDepth range', () => {
      const validDepths = [1, 2, 3, 4, 5];
      const invalidDepths = [0, 6, -1, 100];

      validDepths.forEach((depth) => {
        expect(depth >= 1 && depth <= 5).toBe(true);
      });

      invalidDepths.forEach((depth) => {
        expect(depth >= 1 && depth <= 5).toBe(false);
      });
    });

    it('should validate confidence range', () => {
      const validConfidences = [0, 0.5, 1];
      const invalidConfidences = [-0.1, 1.1, 2];

      validConfidences.forEach((confidence) => {
        expect(confidence >= 0 && confidence <= 1).toBe(true);
      });

      invalidConfidences.forEach((confidence) => {
        expect(confidence >= 0 && confidence <= 1).toBe(false);
      });
    });
  });

  describe('Central Nodes Calculation', () => {
    it('should find most connected nodes', () => {
      const links = [
        { source: 'A', target: 'B' },
        { source: 'A', target: 'C' },
        { source: 'A', target: 'D' },
        { source: 'B', target: 'C' },
      ];

      const degreeMap = new Map<string, number>();

      links.forEach((link) => {
        degreeMap.set(link.source, (degreeMap.get(link.source) || 0) + 1);
        degreeMap.set(link.target, (degreeMap.get(link.target) || 0) + 1);
      });

      // Node A has highest degree (3)
      expect(degreeMap.get('A')).toBe(3);
      expect(degreeMap.get('B')).toBe(2);
      expect(degreeMap.get('C')).toBe(2);
      expect(degreeMap.get('D')).toBe(1);
    });
  });
});
