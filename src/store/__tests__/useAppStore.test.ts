import { act, renderHook, waitFor } from '@testing-library/react';
import { useAppStore } from '../useAppStore';
import { GraphApiService } from '@/services/graphApi';
import { ClaimsApiService } from '@/services/claimsApi';
import { apiService } from '@/services/api';

// Mock the API services
jest.mock('@/services/graphApi', () => ({
  GraphApiService: {
    getGraphData: jest.fn(),
    getClaimGraph: jest.fn(),
    normalizeGraphData: jest.fn((data) => data),
  },
}));

jest.mock('@/services/claimsApi', () => ({
  ClaimsApiService: {
    connectClaims: jest.fn(),
    toGraphLink: jest.fn((sourceId, targetId, type, confidence, tempId) => ({
      id: tempId,
      source: sourceId,
      target: targetId,
      type,
      strength: confidence,
      label: type,
    })),
  },
}));

jest.mock('@/services/api', () => ({
  apiService: {
    get: jest.fn(),
  },
}));

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connected: true,
  })),
}));

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useAppStore.setState({
      claims: [],
      selectedClaim: null,
      selectedNode: null,
      searchQuery: '',
      graphSearchQuery: '',
      filters: {},
      graphFilters: {
        nodeTypes: ['claim', 'evidence', 'reasoning'],
        confidenceRange: [0, 1],
        linkTypes: ['supports', 'contradicts', 'relates', 'reasoning'],
        showLabels: true,
        showIsolated: false,
        groupBy: undefined,
      },
      graphLayout: {
        name: 'force',
        label: 'Force Directed',
        description: 'Natural clustering based on connections',
        forces: {
          link: { distance: 100, strength: 1 },
          charge: { strength: -300 },
          center: { x: 0, y: 0 },
          collision: { radius: 30 },
        },
      },
      graphData: { nodes: [], links: [] },
      collaborationSession: null,
      user: null,
      loading: false,
      error: null,
      activeUsers: [],
      comments: [],
      validationResults: {},
      changeHistory: [],
      conflicts: [],
      isConnected: false,
      reconnecting: false,
      editingClaim: null,
      notifications: [],
      searchResults: [],
      searchFacets: null,
      searchHistory: [],
      graphMetrics: null,
      currentProjectId: null,
      socket: null,
    });
    jest.clearAllMocks();
  });

  describe('searchClaims', () => {
    const mockSearchResponse = {
      data: {
        data: [
          { id: '1', title: 'Climate Change', type: 'claim', relevanceScore: 0.9 },
          { id: '2', title: 'Evidence for warming', type: 'evidence', relevanceScore: 0.8 },
        ],
        pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
        facets: {
          types: { claim: 10, evidence: 5 },
          status: { published: 12, draft: 3 },
          tags: [{ name: 'climate', count: 8 }],
        },
      },
    };

    it('should set loading state and call API', async () => {
      (apiService.get as jest.Mock).mockResolvedValue(mockSearchResponse);

      const { result } = renderHook(() => useAppStore());

      await act(async () => {
        await result.current.searchClaims('climate change');
      });

      expect(apiService.get).toHaveBeenCalledWith('/api/search', {
        params: expect.objectContaining({
          q: 'climate change',
          type: 'all',
          page: 1,
          limit: 20,
          sort: 'relevance',
        }),
      });
    });

    it('should update search results on success', async () => {
      (apiService.get as jest.Mock).mockResolvedValue(mockSearchResponse);

      const { result } = renderHook(() => useAppStore());

      await act(async () => {
        await result.current.searchClaims('climate change');
      });

      expect(result.current.searchResults).toHaveLength(2);
      expect(result.current.searchFacets).toBeDefined();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should add query to search history', async () => {
      (apiService.get as jest.Mock).mockResolvedValue(mockSearchResponse);

      const { result } = renderHook(() => useAppStore());

      await act(async () => {
        await result.current.searchClaims('climate change');
      });

      expect(result.current.searchHistory).toContain('climate change');
    });

    it('should handle API errors', async () => {
      const errorMessage = 'Search service unavailable';
      (apiService.get as jest.Mock).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useAppStore());

      await act(async () => {
        await result.current.searchClaims('test query');
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.searchResults).toEqual([]);
      expect(result.current.loading).toBe(false);
    });

    it('should include filters in API params', async () => {
      (apiService.get as jest.Mock).mockResolvedValue(mockSearchResponse);

      const { result } = renderHook(() => useAppStore());

      await act(async () => {
        await result.current.searchClaims('test', {
          type: ['claim', 'evidence'],
          tags: ['science'],
          confidence: { min: 0.5, max: 1 },
        });
      });

      expect(apiService.get).toHaveBeenCalledWith('/api/search', {
        params: expect.objectContaining({
          type: 'claim,evidence',
          tags: ['science'],
          minConfidence: 0.5,
        }),
      });
    });
  });

  describe('loadGraphData', () => {
    const mockGraphResponse = {
      nodes: [
        { id: '1', type: 'claim', label: 'Test Claim', size: 20, color: '#3b82f6' },
        { id: '2', type: 'evidence', label: 'Test Evidence', size: 15, color: '#10b981' },
      ],
      links: [
        { id: 'l1', source: '2', target: '1', type: 'supports', strength: 0.8 },
      ],
      metrics: {
        nodeCount: 2,
        linkCount: 1,
        density: 0.5,
        averageDegree: 1,
        clusters: 1,
      },
    };

    it('should load graph data for a project ID', async () => {
      (GraphApiService.getGraphData as jest.Mock).mockResolvedValue(mockGraphResponse);
      (GraphApiService.normalizeGraphData as jest.Mock).mockReturnValue({
        nodes: mockGraphResponse.nodes,
        links: mockGraphResponse.links,
      });

      const { result } = renderHook(() => useAppStore());

      await act(async () => {
        await result.current.loadGraphData('project123');
      });

      expect(GraphApiService.getGraphData).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'project123',
          includeEvidence: true,
        })
      );
      expect(result.current.currentProjectId).toBe('project123');
    });

    it('should load claim-centered graph for valid ObjectId', async () => {
      const claimId = '507f1f77bcf86cd799439011'; // Valid MongoDB ObjectId
      (GraphApiService.getClaimGraph as jest.Mock).mockResolvedValue(mockGraphResponse);
      (GraphApiService.normalizeGraphData as jest.Mock).mockReturnValue({
        nodes: mockGraphResponse.nodes,
        links: mockGraphResponse.links,
      });

      const { result } = renderHook(() => useAppStore());

      await act(async () => {
        await result.current.loadGraphData(claimId);
      });

      expect(GraphApiService.getClaimGraph).toHaveBeenCalledWith(claimId, 2, true);
    });

    it('should update graphData and graphMetrics on success', async () => {
      (GraphApiService.getGraphData as jest.Mock).mockResolvedValue(mockGraphResponse);
      (GraphApiService.normalizeGraphData as jest.Mock).mockReturnValue({
        nodes: mockGraphResponse.nodes,
        links: mockGraphResponse.links,
      });

      const { result } = renderHook(() => useAppStore());

      await act(async () => {
        await result.current.loadGraphData('project123');
      });

      expect(result.current.graphData.nodes).toHaveLength(2);
      expect(result.current.graphData.links).toHaveLength(1);
      expect(result.current.graphMetrics).toEqual(mockGraphResponse.metrics);
      expect(result.current.loading).toBe(false);
    });

    it('should handle errors', async () => {
      const errorMessage = 'Failed to load graph';
      (GraphApiService.getGraphData as jest.Mock).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useAppStore());

      await act(async () => {
        await result.current.loadGraphData('project123');
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.loading).toBe(false);
    });
  });

  describe('connectNodes', () => {
    it('should optimistically add link before API call', async () => {
      (ClaimsApiService.connectClaims as jest.Mock).mockResolvedValue({});

      const { result } = renderHook(() => useAppStore());

      // Set up initial graph data
      act(() => {
        result.current.setGraphData({
          nodes: [
            { id: '1', type: 'claim', label: 'Claim 1', size: 20, color: '#3b82f6', data: {} as any },
            { id: '2', type: 'claim', label: 'Claim 2', size: 20, color: '#3b82f6', data: {} as any },
          ],
          links: [],
        });
      });

      // Start the connection
      const connectPromise = act(async () => {
        await result.current.connectNodes('1', '2', 'supports');
      });

      // The link should be added optimistically (before promise resolves)
      await connectPromise;

      expect(result.current.graphData.links).toHaveLength(1);
      expect(result.current.graphData.links[0].source).toBe('1');
      expect(result.current.graphData.links[0].target).toBe('2');
    });

    it('should call ClaimsApiService.connectClaims', async () => {
      (ClaimsApiService.connectClaims as jest.Mock).mockResolvedValue({});

      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setGraphData({
          nodes: [
            { id: '1', type: 'claim', label: 'Claim 1', size: 20, color: '#3b82f6', data: {} as any },
            { id: '2', type: 'claim', label: 'Claim 2', size: 20, color: '#3b82f6', data: {} as any },
          ],
          links: [],
        });
      });

      await act(async () => {
        await result.current.connectNodes('1', '2', 'supports');
      });

      expect(ClaimsApiService.connectClaims).toHaveBeenCalledWith('1', '2', 'supports', 0.8);
    });

    it('should rollback on API error', async () => {
      (ClaimsApiService.connectClaims as jest.Mock).mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setGraphData({
          nodes: [
            { id: '1', type: 'claim', label: 'Claim 1', size: 20, color: '#3b82f6', data: {} as any },
            { id: '2', type: 'claim', label: 'Claim 2', size: 20, color: '#3b82f6', data: {} as any },
          ],
          links: [],
        });
      });

      await act(async () => {
        await result.current.connectNodes('1', '2', 'supports');
      });

      // Should rollback to empty links
      expect(result.current.graphData.links).toHaveLength(0);
      expect(result.current.error).toBe('API Error');
    });
  });

  describe('addToSearchHistory', () => {
    it('should add new queries to history', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.addToSearchHistory('query 1');
      });

      expect(result.current.searchHistory).toEqual(['query 1']);

      act(() => {
        result.current.addToSearchHistory('query 2');
      });

      expect(result.current.searchHistory).toEqual(['query 2', 'query 1']);
    });

    it('should not add duplicate queries', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.addToSearchHistory('query 1');
        result.current.addToSearchHistory('query 2');
        result.current.addToSearchHistory('query 1'); // Duplicate
      });

      expect(result.current.searchHistory).toEqual(['query 1', 'query 2']);
    });

    it('should limit history to 20 items', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        for (let i = 0; i < 25; i++) {
          result.current.addToSearchHistory(`query ${i}`);
        }
      });

      expect(result.current.searchHistory).toHaveLength(20);
      expect(result.current.searchHistory[0]).toBe('query 24');
    });
  });

  describe('applyGraphFilters', () => {
    it('should filter nodes by type', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setGraphData({
          nodes: [
            { id: '1', type: 'claim', label: 'Claim', size: 20, color: '#3b82f6', confidence: 0.9, data: {} as any },
            { id: '2', type: 'evidence', label: 'Evidence', size: 15, color: '#10b981', confidence: 0.8, data: {} as any },
            { id: '3', type: 'reasoning', label: 'Reasoning', size: 18, color: '#8b5cf6', confidence: 0.7, data: {} as any },
          ],
          links: [
            { id: 'l1', source: '2', target: '1', type: 'supports', strength: 0.8 },
          ],
        });
      });

      act(() => {
        result.current.applyGraphFilters({
          nodeTypes: ['claim'],
          confidenceRange: [0, 1],
          linkTypes: ['supports', 'contradicts', 'relates', 'reasoning'],
          showLabels: true,
          showIsolated: false,
        });
      });

      expect(result.current.graphData.nodes).toHaveLength(1);
      expect(result.current.graphData.nodes[0].type).toBe('claim');
    });

    it('should filter nodes by confidence range', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setGraphData({
          nodes: [
            { id: '1', type: 'claim', label: 'High confidence', size: 20, color: '#3b82f6', confidence: 0.9, data: {} as any },
            { id: '2', type: 'claim', label: 'Low confidence', size: 20, color: '#3b82f6', confidence: 0.3, data: {} as any },
          ],
          links: [],
        });
      });

      act(() => {
        result.current.applyGraphFilters({
          nodeTypes: ['claim', 'evidence', 'reasoning'],
          confidenceRange: [0.5, 1],
          linkTypes: ['supports', 'contradicts', 'relates', 'reasoning'],
          showLabels: true,
          showIsolated: false,
        });
      });

      expect(result.current.graphData.nodes).toHaveLength(1);
      expect(result.current.graphData.nodes[0].confidence).toBe(0.9);
    });

    it('should filter links when their nodes are removed', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setGraphData({
          nodes: [
            { id: '1', type: 'claim', label: 'Claim', size: 20, color: '#3b82f6', confidence: 0.9, data: {} as any },
            { id: '2', type: 'evidence', label: 'Evidence', size: 15, color: '#10b981', confidence: 0.8, data: {} as any },
          ],
          links: [
            { id: 'l1', source: '2', target: '1', type: 'supports', strength: 0.8 },
          ],
        });
      });

      act(() => {
        result.current.applyGraphFilters({
          nodeTypes: ['claim'], // Remove evidence, which should also remove the link
          confidenceRange: [0, 1],
          linkTypes: ['supports', 'contradicts', 'relates', 'reasoning'],
          showLabels: true,
          showIsolated: false,
        });
      });

      expect(result.current.graphData.links).toHaveLength(0);
    });
  });

  describe('setGraphMetrics', () => {
    it('should update graph metrics', () => {
      const { result } = renderHook(() => useAppStore());

      const metrics = {
        nodeCount: 10,
        linkCount: 15,
        density: 0.33,
        averageDegree: 3,
        clusters: 2,
      };

      act(() => {
        result.current.setGraphMetrics(metrics);
      });

      expect(result.current.graphMetrics).toEqual(metrics);
    });

    it('should allow setting metrics to null', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setGraphMetrics({ nodeCount: 5, linkCount: 3, density: 0.5, averageDegree: 1.2, clusters: 1 });
      });

      act(() => {
        result.current.setGraphMetrics(null);
      });

      expect(result.current.graphMetrics).toBeNull();
    });
  });
});
