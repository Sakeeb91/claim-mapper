import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  AppState,
  Claim,
  GraphData,
  GraphFilters,
  GraphLayout,
  SearchFilters,
  SearchResult,
  SearchFacetsResult,
  GraphMetrics,
  User,
  UserPresence,
  Comment,
  ValidationResult,
  ChangeEvent,
  ConflictResolution,
  Notification
} from '@/types';
import { io, Socket } from 'socket.io-client';
import { GraphApiService } from '@/services/graphApi';
import { ClaimsApiService } from '@/services/claimsApi';
import { apiService } from '@/services/api';

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
  setSearchResults: (results: SearchResult[]) => void;
  setSearchFacets: (facets: SearchFacetsResult | null) => void;
  addToSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;
  
  // Graph
  setGraphData: (data: GraphData) => void;
  setGraphFilters: (filters: GraphFilters) => void;
  setGraphLayout: (layout: GraphLayout) => void;
  setGraphMetrics: (metrics: GraphMetrics | null) => void;
  setCurrentProjectId: (projectId: string | null) => void;
  applyGraphFilters: (filters: GraphFilters) => void;
  
  // UI State
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Actions
  searchClaims: (query: string, filters?: SearchFilters) => Promise<void>;
  loadGraphData: (claimId?: string) => Promise<void>;
  searchInGraph: (query: string) => void;
  resetGraphView: () => void;
  connectNodes: (sourceId: string, targetId: string, type: string) => Promise<void>;
  
  // WebSocket and Collaboration
  socket: Socket | null;
  initializeWebSocket: (token: string) => void;
  disconnectWebSocket: () => void;
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
  
  // User Presence
  setActiveUsers: (users: UserPresence[]) => void;
  updateUserPresence: (userId: string, presence: Partial<UserPresence>) => void;
  removeUser: (userId: string) => void;
  
  // Comments
  setComments: (comments: Comment[]) => void;
  addComment: (comment: Comment) => void;
  updateComment: (id: string, updates: Partial<Comment>) => void;
  deleteComment: (id: string) => void;
  resolveComment: (id: string) => void;
  
  // Validation
  setValidationResults: (results: Record<string, ValidationResult>) => void;
  updateValidationResult: (claimId: string, result: ValidationResult) => void;
  
  // Change History
  addChangeEvent: (event: ChangeEvent) => void;
  setChangeHistory: (history: ChangeEvent[]) => void;
  
  // Conflicts
  addConflict: (conflict: ConflictResolution) => void;
  resolveConflict: (conflictId: string, resolution: any) => void;
  
  // Editing
  startEditingClaim: (claimId: string) => Promise<void>;
  stopEditingClaim: (claimId: string, save?: boolean) => Promise<void>;
  
  // Notifications
  addNotification: (notification: Notification) => void;
  markNotificationRead: (notificationId: string) => void;
  clearNotifications: () => void;
  
  // Connection status
  setConnectionStatus: (connected: boolean, reconnecting?: boolean) => void;
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
  // Enhanced collaboration state
  activeUsers: [],
  comments: [],
  validationResults: {},
  changeHistory: [],
  conflicts: [],
  isConnected: false,
  reconnecting: false,
  editingClaim: null,
  notifications: [],
  // Search state
  searchResults: [],
  searchFacets: null,
  searchHistory: [],
  // Graph state
  graphMetrics: null,
  currentProjectId: null,
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
      setSearchResults: (results) => set({ searchResults: results }),
      setSearchFacets: (facets) => set({ searchFacets: facets }),
      addToSearchHistory: (query) => {
        const { searchHistory } = get();
        // Avoid duplicates, keep most recent 20 searches
        const filtered = searchHistory.filter(q => q !== query);
        set({ searchHistory: [query, ...filtered].slice(0, 20) });
      },
      clearSearchHistory: () => set({ searchHistory: [] }),

      // Graph
      setGraphData: (data) => set({ graphData: data }),
      setGraphFilters: (filters) => set({ graphFilters: filters }),
      setGraphLayout: (layout) => set({ graphLayout: layout }),
      setGraphMetrics: (metrics) => set({ graphMetrics: metrics }),
      setCurrentProjectId: (projectId) => set({ currentProjectId: projectId }),
      applyGraphFilters: (filters) => {
        // Apply filters to the current graph data
        const { graphData } = get();
        const filteredNodes = graphData.nodes.filter(node => {
          // Filter by node type
          if (!filters.nodeTypes.includes(node.type)) return false;
          // Filter by confidence range
          const confidence = node.confidence ?? 0.5;
          if (confidence < filters.confidenceRange[0] || confidence > filters.confidenceRange[1]) {
            return false;
          }
          return true;
        });
        const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
        const filteredLinks = graphData.links.filter(link => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          // Filter by link type and ensure both nodes exist
          return filters.linkTypes.includes(link.type) &&
                 filteredNodeIds.has(sourceId) &&
                 filteredNodeIds.has(targetId);
        });
        set({
          graphFilters: filters,
          graphData: { nodes: filteredNodes, links: filteredLinks }
        });
      },

      // UI State
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),

      // Actions
      searchClaims: async (query, filters) => {
        set({ loading: true, error: null, searchQuery: query });

        try {
          // Build query params for the search API
          const params: Record<string, unknown> = {
            q: query,
            type: 'all',
            page: 1,
            limit: 20,
            sort: 'relevance',
          };

          // Apply optional filters
          if (filters?.type && filters.type.length > 0) {
            params.type = filters.type.join(',');
          }
          if (filters?.tags && filters.tags.length > 0) {
            params.tags = filters.tags;
          }
          if (filters?.confidence?.min !== undefined) {
            params.minConfidence = filters.confidence.min;
          }
          if (filters?.dateRange?.start) {
            params.dateFrom = filters.dateRange.start.toISOString();
          }
          if (filters?.dateRange?.end) {
            params.dateTo = filters.dateRange.end.toISOString();
          }
          if (filters?.author && filters.author.length > 0) {
            params.authors = filters.author;
          }

          // Call the search API
          const response = await apiService.get<{
            data: SearchResult[];
            pagination: {
              page: number;
              limit: number;
              total: number;
              totalPages: number;
            };
            facets: {
              types: Record<string, number>;
              status: Record<string, number>;
              tags: Array<{ name: string; count: number }>;
            };
          }>('/api/search', { params });

          // Update store with search results
          set({
            searchResults: response.data.data || [],
            searchFacets: response.data.facets || null,
            loading: false,
          });

          // Add to search history
          const { addToSearchHistory } = get();
          addToSearchHistory(query);

        } catch (error) {
          const errorMessage = error instanceof Error
            ? error.message
            : (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Search failed';
          set({
            error: errorMessage,
            loading: false,
            searchResults: [],
          });
        }
      },

      loadGraphData: async (claimIdOrProjectId) => {
        set({ loading: true, error: null });

        try {
          let graphResponse;
          const { graphFilters, currentProjectId } = get();

          // Determine if we're loading by claim ID or project ID
          if (claimIdOrProjectId) {
            // Check if it looks like a claim-specific request (MongoDB ObjectId)
            const isClaimId = /^[0-9a-fA-F]{24}$/.test(claimIdOrProjectId);

            if (isClaimId) {
              // Load graph centered on a specific claim
              graphResponse = await GraphApiService.getClaimGraph(
                claimIdOrProjectId,
                2, // maxDepth
                true // includeEvidence
              );
            } else {
              // Treat as projectId
              set({ currentProjectId: claimIdOrProjectId });
              graphResponse = await GraphApiService.getGraphData({
                projectId: claimIdOrProjectId,
                includeEvidence: true,
                includeReasoning: false,
                limit: 500,
              });
            }
          } else if (currentProjectId) {
            // Reload current project's graph
            graphResponse = await GraphApiService.getGraphData({
              projectId: currentProjectId,
              includeEvidence: true,
              includeReasoning: false,
              limit: 500,
            });
          } else {
            // No project or claim specified - load all accessible data
            graphResponse = await GraphApiService.getGraphData({
              includeEvidence: true,
              limit: 500,
            });
          }

          // Normalize and set graph data
          const normalizedData = GraphApiService.normalizeGraphData(graphResponse);

          set({
            graphData: normalizedData,
            graphMetrics: graphResponse.metrics,
            loading: false,
          });

          // Apply current filters if any
          if (graphFilters) {
            const { applyGraphFilters } = get();
            applyGraphFilters(graphFilters);
          }

        } catch (error) {
          const errorMessage = error instanceof Error
            ? error.message
            : (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to load graph';
          set({
            error: errorMessage,
            loading: false,
          });
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
        const { graphData, socket, currentProjectId } = get();

        // Create optimistic link with temp ID
        const tempLinkId = `temp_link_${Date.now()}`;
        const optimisticLink = ClaimsApiService.toGraphLink(
          sourceId,
          targetId,
          type as 'supports' | 'contradicts' | 'relates' | 'questions' | 'elaborates' | 'similar',
          0.8, // Default confidence
          tempLinkId
        );

        // Store original links for potential rollback
        const originalLinks = [...graphData.links];

        // Optimistic update - add the link immediately for instant UX
        set({
          graphData: {
            ...graphData,
            links: [...graphData.links, optimisticLink],
          },
        });

        try {
          // Call API to create the relationship
          await ClaimsApiService.connectClaims(
            sourceId,
            targetId,
            type as 'supports' | 'contradicts' | 'relates' | 'questions' | 'elaborates' | 'similar',
            0.8 // Default confidence
          );

          // Replace temp link with confirmed link (update ID if needed)
          const confirmedLinks = get().graphData.links.map(link =>
            link.id === tempLinkId
              ? { ...link, id: `link_${sourceId}_${targetId}_${Date.now()}` }
              : link
          );

          set({
            graphData: {
              ...get().graphData,
              links: confirmedLinks,
            },
          });

          // Emit WebSocket event for real-time collaboration
          if (socket && socket.connected) {
            socket.emit('relationship_created', {
              projectId: currentProjectId,
              sourceId,
              targetId,
              relationship: type,
              link: optimisticLink,
            });
          }

        } catch (error) {
          // Rollback optimistic update on error
          set({
            graphData: {
              ...graphData,
              links: originalLinks,
            },
            error: error instanceof Error
              ? error.message
              : (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to connect nodes',
          });
        }
      },
      
      // WebSocket and Collaboration
      socket: null,
      
      initializeWebSocket: (token: string) => {
        const { socket: currentSocket } = get();
        if (currentSocket) {
          currentSocket.disconnect();
        }
        
        const newSocket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001', {
          auth: { token },
          transports: ['websocket', 'polling'],
        });
        
        // Connection events
        newSocket.on('connect', () => {
          console.log('WebSocket connected');
          set({ isConnected: true, reconnecting: false });
        });
        
        newSocket.on('disconnect', (reason) => {
          console.log('WebSocket disconnected:', reason);
          set({ isConnected: false });
        });
        
        newSocket.on('reconnect_attempt', () => {
          set({ reconnecting: true });
        });
        
        // User presence events
        newSocket.on('user_joined_project', (data) => {
          const { activeUsers } = get();
          const userPresence: UserPresence = {
            userId: data.userId,
            user: data.user,
            lastUpdate: new Date(data.timestamp),
            activity: 'viewing'
          };
          set({ activeUsers: [...activeUsers.filter(u => u.userId !== data.userId), userPresence] });
        });
        
        newSocket.on('user_left_project', (data) => {
          const { activeUsers } = get();
          set({ activeUsers: activeUsers.filter(u => u.userId !== data.userId) });
        });
        
        newSocket.on('cursor_update', (data) => {
          const { updateUserPresence } = get();
          updateUserPresence(data.userId, {
            cursor: {
              x: data.position.x,
              y: data.position.y,
              elementId: data.elementId,
              selection: data.selection
            },
            lastUpdate: new Date()
          });
        });
        
        // Claim editing events
        newSocket.on('claim_edit_started', (data) => {
          const { addNotification } = get();
          addNotification({
            id: `edit_${data.claimId}_${Date.now()}`,
            type: 'system',
            title: 'Claim Being Edited',
            message: `${data.user.name} started editing a claim`,
            userId: data.userId,
            read: false,
            createdAt: new Date(),
            priority: 'low'
          });
        });
        
        newSocket.on('claim_edit_update', (data) => {
          // Handle real-time claim updates
          const { updateClaim, addChangeEvent } = get();
          updateClaim(data.claimId, data.changes);
          
          addChangeEvent({
            id: `change_${Date.now()}`,
            type: 'update',
            entityType: 'claim',
            entityId: data.claimId,
            userId: data.userId,
            user: data.user,
            changes: data.changes,
            timestamp: new Date()
          });
        });
        
        newSocket.on('claim_edit_conflict', (data) => {
          const { addConflict } = get();
          addConflict({
            id: `conflict_${Date.now()}`,
            conflictType: 'concurrent_edit',
            entityId: data.claimId,
            conflictingUsers: [data.currentEditor],
            proposedResolution: 'manual_review',
            status: 'pending',
            createdAt: new Date()
          });
        });
        
        // Comment events
        newSocket.on('comment_added', (data) => {
          const { addComment } = get();
          addComment(data.comment);
        });
        
        set({ socket: newSocket });
      },
      
      disconnectWebSocket: () => {
        const { socket } = get();
        if (socket) {
          socket.disconnect();
          set({ socket: null, isConnected: false });
        }
      },
      
      joinProject: (projectId: string) => {
        const { socket } = get();
        if (socket) {
          socket.emit('join_project', { projectId });
        }
      },
      
      leaveProject: (projectId: string) => {
        const { socket } = get();
        if (socket) {
          socket.emit('leave_project', { projectId });
        }
      },
      
      // User Presence
      setActiveUsers: (users) => set({ activeUsers: users }),
      
      updateUserPresence: (userId, presence) => {
        const { activeUsers } = get();
        const updatedUsers = activeUsers.map(user => 
          user.userId === userId 
            ? { ...user, ...presence, lastUpdate: new Date() }
            : user
        );
        set({ activeUsers: updatedUsers });
      },
      
      removeUser: (userId) => {
        const { activeUsers } = get();
        set({ activeUsers: activeUsers.filter(u => u.userId !== userId) });
      },
      
      // Comments
      setComments: (comments) => set({ comments }),
      
      addComment: (comment) => {
        const { comments } = get();
        set({ comments: [...comments, comment] });
      },
      
      updateComment: (id, updates) => {
        const { comments } = get();
        set({
          comments: comments.map(comment =>
            comment.id === id ? { ...comment, ...updates } : comment
          )
        });
      },
      
      deleteComment: (id) => {
        const { comments } = get();
        set({ comments: comments.filter(c => c.id !== id) });
      },
      
      resolveComment: (id) => {
        const { updateComment } = get();
        updateComment(id, { resolved: true });
      },
      
      // Validation
      setValidationResults: (results) => set({ validationResults: results }),
      
      updateValidationResult: (claimId, result) => {
        const { validationResults } = get();
        set({
          validationResults: {
            ...validationResults,
            [claimId]: result
          }
        });
      },
      
      // Change History
      addChangeEvent: (event) => {
        const { changeHistory } = get();
        set({ changeHistory: [event, ...changeHistory.slice(0, 99)] }); // Keep last 100 events
      },
      
      setChangeHistory: (history) => set({ changeHistory: history }),
      
      // Conflicts
      addConflict: (conflict) => {
        const { conflicts } = get();
        set({ conflicts: [conflict, ...conflicts] });
      },
      
      resolveConflict: (conflictId, resolution) => {
        const { conflicts } = get();
        set({
          conflicts: conflicts.map(conflict =>
            conflict.id === conflictId
              ? { ...conflict, status: 'resolved', resolvedAt: new Date() }
              : conflict
          )
        });
      },
      
      // Editing
      startEditingClaim: async (claimId) => {
        const { socket } = get();
        if (socket) {
          socket.emit('claim_edit_start', { claimId, projectId: 'current-project' });
          set({ editingClaim: claimId });
        }
      },
      
      stopEditingClaim: async (claimId, save = true) => {
        const { socket } = get();
        if (socket) {
          socket.emit('claim_edit_end', { claimId, projectId: 'current-project', save });
          set({ editingClaim: null });
        }
      },
      
      // Notifications
      addNotification: (notification) => {
        const { notifications } = get();
        set({ notifications: [notification, ...notifications] });
      },
      
      markNotificationRead: (notificationId) => {
        const { notifications } = get();
        set({
          notifications: notifications.map(n =>
            n.id === notificationId ? { ...n, read: true } : n
          )
        });
      },
      
      clearNotifications: () => set({ notifications: [] }),
      
      // Connection status
      setConnectionStatus: (connected, reconnecting = false) => {
        set({ isConnected: connected, reconnecting });
      },
    }),
    {
      name: 'claim-mapper-store',
      partialize: (state: AppState & AppActions) => ({
        user: state.user,
        // Don't persist real-time collaboration data
      }),
    }
  )
);