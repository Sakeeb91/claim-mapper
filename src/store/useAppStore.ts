import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { AppState, Claim, GraphData, SearchFilters } from '@/types';

interface AppActions {
  // Claims
  setClaims: (claims: Claim[]) => void;
  addClaim: (claim: Claim) => void;
  updateClaim: (id: string, updates: Partial<Claim>) => void;
  deleteClaim: (id: string) => void;
  
  // Selection
  setSelectedClaim: (claimId: string | null) => void;
  
  // Search
  setSearchQuery: (query: string) => void;
  setFilters: (filters: SearchFilters) => void;
  
  // Graph
  setGraphData: (data: GraphData) => void;
  
  // UI State
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Actions
  searchClaims: (query: string, filters?: SearchFilters) => Promise<void>;
  loadGraphData: (claimId?: string) => Promise<void>;
}

const initialState: AppState = {
  claims: [],
  selectedClaim: null,
  searchQuery: '',
  filters: {},
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

      // Search
      setSearchQuery: (query) => set({ searchQuery: query }),
      setFilters: (filters) => set({ filters }),

      // Graph
      setGraphData: (data) => set({ graphData: data }),

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
          // const graphData = await loadGraphAPI(claimId);
          // set({ graphData });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to load graph' });
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