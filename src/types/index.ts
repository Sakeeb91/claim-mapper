// Core entity types
export interface Claim {
  id: string;
  text: string;
  type: 'hypothesis' | 'assertion' | 'question';
  confidence: number;
  source?: string;
  author?: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  evidence: Evidence[];
  reasoning: ReasoningChain[];
}

export interface Evidence {
  id: string;
  text: string;
  type: 'supporting' | 'contradicting' | 'neutral';
  source: string;
  reliability: number;
  claimId: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface ReasoningChain {
  id: string;
  steps: ReasoningStep[];
  claimId: string;
  type: 'deductive' | 'inductive' | 'abductive';
  createdAt: Date;
  author?: string;
}

export interface ReasoningStep {
  id: string;
  text: string;
  order: number;
  type: 'premise' | 'inference' | 'conclusion';
  confidence: number;
}

// Graph visualization types
export interface GraphNode {
  id: string;
  type: 'claim' | 'evidence' | 'reasoning';
  label: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  size: number;
  color: string;
  group?: string;
  confidence?: number;
  data: Claim | Evidence | ReasoningChain;
}

export interface GraphLink {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  type: 'supports' | 'contradicts' | 'relates' | 'reasoning';
  strength: number;
  label?: string;
  curved?: boolean;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface GraphLayout {
  name: string;
  label: string;
  description: string;
  forces: {
    link?: { distance: number; strength: number };
    charge?: { strength: number };
    center?: { x: number; y: number };
    collision?: { radius: number };
  };
}

export interface GraphFilters {
  nodeTypes: ('claim' | 'evidence' | 'reasoning')[];
  confidenceRange: [number, number];
  linkTypes: ('supports' | 'contradicts' | 'relates' | 'reasoning')[];
  showLabels: boolean;
  showIsolated: boolean;
  groupBy?: 'type' | 'confidence' | 'author' | 'tag';
}

// Search and filtering types
export interface SearchFilters {
  type?: ('claim' | 'evidence' | 'reasoning')[];
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  confidence?: {
    min: number;
    max: number;
  };
  author?: string[];
}

export interface SearchResult {
  id: string;
  type: 'claim' | 'evidence' | 'reasoning';
  title: string;
  snippet: string;
  relevance: number;
  data: Claim | Evidence | ReasoningChain;
}

// Collaboration types
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'viewer' | 'editor' | 'admin';
}

export interface CollaborationSession {
  id: string;
  users: User[];
  documentId: string;
  createdAt: Date;
  lastActivity: Date;
}

export interface Comment {
  id: string;
  text: string;
  author: User;
  targetId: string;
  targetType: 'claim' | 'evidence' | 'reasoning';
  position?: { x: number; y: number };
  createdAt: Date;
  resolved: boolean;
  replies: Comment[];
}

// API response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Store types
export interface AppState {
  claims: Claim[];
  selectedClaim: string | null;
  selectedNode: string | null;
  searchQuery: string;
  graphSearchQuery: string;
  filters: SearchFilters;
  graphFilters: GraphFilters;
  graphLayout: GraphLayout;
  graphData: GraphData;
  collaborationSession: CollaborationSession | null;
  user: User | null;
  loading: boolean;
  error: string | null;
}

// Component props types
export interface GraphVisualizationProps {
  selectedClaim: string | null;
  searchQuery: string;
  onNodeSelect: (nodeId: string) => void;
}

export interface ClaimPanelProps {
  selectedClaim: string | null;
  onClaimSelect: (claimId: string) => void;
}

export interface SearchPanelProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

// Enhanced graph component props
export interface KnowledgeGraphProps {
  data: GraphData;
  selectedNodeId?: string;
  onNodeSelect: (nodeId: string) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
  filters: GraphFilters;
  layout: GraphLayout;
  width?: number;
  height?: number;
  className?: string;
}

export interface GraphControlsProps {
  filters: GraphFilters;
  onFiltersChange: (filters: GraphFilters) => void;
  layout: GraphLayout;
  onLayoutChange: (layout: GraphLayout) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onResetView: () => void;
  onExport?: () => void;
}

export interface NodeDetailsPanelProps {
  nodeId: string | null;
  onClose: () => void;
  onEdit?: (nodeId: string) => void;
  onConnect?: (sourceId: string, targetId: string) => void;
}

export interface ReasoningChainVisualizerProps {
  reasoning: ReasoningChain;
  onStepSelect?: (stepId: string) => void;
  interactive?: boolean;
  compact?: boolean;
}