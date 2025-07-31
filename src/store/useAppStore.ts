import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { AppState, Claim, GraphData, GraphFilters, GraphLayout, SearchFilters } from '@/types';

interface AppActions {
  // Claims
  setClaims: (claims: Claim[]) => void;
  addClaim: (claim: Claim) => void;
  updateClaim: (id: string, updates: Partial<Claim>) => void;
  deleteClaim: (id: string) => void;
  
  // Selection
  setSelectedClaim: (claimId: string | null) => void;
  setSelectedNode: (nodeId: string | null) => void;
  
  // Search
  setSearchQuery: (query: string) => void;
  setFilters: (filters: SearchFilters) => void;
  
  // Graph
  setGraphData: (data: GraphData) => void;
  setGraphFilters: (filters: GraphFilters) => void;
  setGraphLayout: (layout: GraphLayout) => void;
  
  // UI State
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Actions
  searchClaims: (query: string, filters?: SearchFilters) => Promise<void>;
  loadGraphData: (claimId?: string) => Promise<void>;
  searchInGraph: (query: string) => void;
  resetGraphView: () => void;
  connectNodes: (sourceId: string, targetId: string, type: string) => Promise<void>;
}

const initialGraphFilters: GraphFilters = {
  nodeTypes: ['claim', 'evidence', 'reasoning'],
  confidenceRange: [0, 1],
  linkTypes: ['supports', 'contradicts', 'relates', 'reasoning'],
  showLabels: true,
  showIsolated: false,
  groupBy: undefined
};

const initialGraphLayout: GraphLayout = {
  name: 'force',
  label: 'Force Directed',
  description: 'Natural clustering based on connections',
  forces: {
    link: { distance: 100, strength: 1 },
    charge: { strength: -300 },
    center: { x: 0, y: 0 },
    collision: { radius: 30 }
  }
};

const initialState: AppState = {
  claims: [],
  selectedClaim: null,
  selectedNode: null,
  searchQuery: '',
  graphSearchQuery: '',
  filters: {},
  graphFilters: initialGraphFilters,
  graphLayout: initialGraphLayout,
  graphData: { nodes: [], links: [] },
  collaborationSession: null,
  user: null,
  loading: false,
  error: null,
};

export const useAppStore = create<AppState & AppActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Claims
      setClaims: (claims) => set({ claims }),
      
      addClaim: (claim) => 
        set((state) => ({ 
          claims: [...state.claims, claim] 
        })),
      
      updateClaim: (id, updates) =>
        set((state) => ({
          claims: state.claims.map(claim =>
            claim.id === id ? { ...claim, ...updates } : claim
          ),
        })),
      
      deleteClaim: (id) =>
        set((state) => ({
          claims: state.claims.filter(claim => claim.id !== id),
          selectedClaim: state.selectedClaim === id ? null : state.selectedClaim,
        })),

      // Selection
      setSelectedClaim: (claimId) => set({ selectedClaim: claimId }),
      setSelectedNode: (nodeId) => set({ selectedNode: nodeId }),

      // Search
      setSearchQuery: (query) => set({ searchQuery: query }),
      setFilters: (filters) => set({ filters }),

      // Graph
      setGraphData: (data) => set({ graphData: data }),
      setGraphFilters: (filters) => set({ graphFilters: filters }),
      setGraphLayout: (layout) => set({ graphLayout: layout }),

      // UI State
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),

      // Actions
      searchClaims: async (query, filters) => {
        set({ loading: true, error: null });
        try {
          // TODO: Implement API call
          console.log('Searching claims:', query, filters);
          // const results = await searchAPI(query, filters);
          // set({ claims: results });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Search failed' });
        } finally {
          set({ loading: false });
        }
      },

      loadGraphData: async (claimId) => {
        set({ loading: true, error: null });
        try {
          // TODO: Implement API call
          console.log('Loading graph data for claim:', claimId);
          
          // Mock data for development
          const mockGraphData = {
            nodes: [
              {
                id: '1',
                type: 'claim' as const,
                label: 'Climate change is real',
                size: 20,
                color: '#3b82f6',
                confidence: 0.9,
                data: {
                  id: '1',
                  text: 'Climate change is a real and pressing issue backed by scientific consensus.',
                  type: 'assertion' as const,
                  confidence: 0.9,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  tags: ['climate', 'science'],
                  evidence: [],
                  reasoning: []
                }
              },
              {
                id: '2',
                type: 'evidence' as const,
                label: 'NASA temperature data',
                size: 15,
                color: '#10b981',
                data: {
                  id: '2',
                  text: 'NASA satellite data shows consistent global temperature increases over the past decades.',
                  type: 'supporting' as const,
                  source: 'NASA',
                  reliability: 0.95,
                  claimId: '1',
                  createdAt: new Date()
                }
              },
              {
                id: '3',
                type: 'reasoning' as const,
                label: 'Scientific consensus analysis',
                size: 18,
                color: '#8b5cf6',
                data: {
                  id: '3',
                  steps: [
                    {
                      id: '3a',
                      text: 'Multiple independent studies show temperature increases',
                      order: 1,
                      type: 'premise' as const,
                      confidence: 0.9
                    },
                    {
                      id: '3b',
                      text: 'The pattern is consistent with greenhouse gas models',
                      order: 2,
                      type: 'inference' as const,
                      confidence: 0.85
                    },
                    {
                      id: '3c',
                      text: 'Therefore, human-caused climate change is occurring',
                      order: 3,
                      type: 'conclusion' as const,
                      confidence: 0.88
                    }
                  ],
                  claimId: '1',
                  type: 'deductive' as const,
                  createdAt: new Date()
                }
              }
            ],
            links: [
              {
                id: 'l1',
                source: '2',
                target: '1',
                type: 'supports' as const,
                strength: 0.8,
                label: 'supports'
              },
              {
                id: 'l2',
                source: '3',
                target: '1',
                type: 'reasoning' as const,
                strength: 0.9,
                label: 'reasoning for'
              }
            ]
          };
          
          set({ graphData: mockGraphData });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to load graph' });
        } finally {
          set({ loading: false });
        }
      },
      
      searchInGraph: (query) => {
        set({ graphSearchQuery: query });
      },
      
      resetGraphView: () => {
        // Reset any view-specific state
        set({ selectedNode: null });
      },
      
      connectNodes: async (sourceId, targetId, type) => {
        set({ loading: true, error: null });
        try {
          // TODO: Implement API call to create connection
          console.log('Connecting nodes:', sourceId, '->', targetId, 'as', type);
          
          // Update local graph data optimistically
          const { graphData } = get();
          const newLink = {
            id: `link_${Date.now()}`,
            source: sourceId,
            target: targetId,
            type: type as any,
            strength: 0.7,
            label: type
          };
          
          set({
            graphData: {
              ...graphData,
              links: [...graphData.links, newLink]
            }
          });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to connect nodes' });
        } finally {
          set({ loading: false });
        }
      },
    }),
    {
      name: 'claim-mapper-store',
    }
  )
);