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
  status?: 'online' | 'offline' | 'away';
  lastSeen?: Date;
  color?: string;
}

export interface CollaborationSession {
  id: string;
  users: User[];
  documentId: string;
  createdAt: Date;
  lastActivity: Date;
  activeEditors: string[];
  editorLocks: Record<string, string>; // elementId -> userId
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
  thread?: string;
  reactions: CommentReaction[];
}

export interface CommentReaction {
  id: string;
  userId: string;
  type: 'like' | 'dislike' | 'agree' | 'disagree';
  createdAt: Date;
}

export interface UserPresence {
  userId: string;
  user: User;
  cursor?: {
    x: number;
    y: number;
    elementId?: string;
    selection?: { start: number; end: number };
  };
  lastUpdate: Date;
  activity: 'viewing' | 'editing' | 'commenting';
}

export interface ValidationSubmission {
  id: string;
  claimId: string;
  validatorId: string;
  validator: User;
  score: number; // 0-100
  confidence: number; // 0-1
  feedback: string;
  category: 'accuracy' | 'relevance' | 'completeness' | 'clarity';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

export interface ValidationResult {
  claimId: string;
  overallScore: number;
  consensus: number; // 0-1
  submissions: ValidationSubmission[];
  expertReviews: ExpertReview[];
  communityScore: number;
  lastValidated: Date;
}

export interface ExpertReview {
  id: string;
  expertId: string;
  expert: User & { expertise: string[]; verified: boolean };
  claimId: string;
  verdict: 'verified' | 'disputed' | 'needs_more_evidence';
  reasoning: string;
  confidence: number;
  createdAt: Date;
}

export interface ChangeEvent {
  id: string;
  type: 'create' | 'update' | 'delete' | 'comment' | 'validate';
  entityType: 'claim' | 'evidence' | 'reasoning' | 'comment';
  entityId: string;
  userId: string;
  user: User;
  changes: Record<string, any>;
  timestamp: Date;
  sessionId?: string;
}

export interface ConflictResolution {
  id: string;
  conflictType: 'concurrent_edit' | 'version_mismatch' | 'permission_conflict';
  entityId: string;
  conflictingUsers: User[];
  proposedResolution: 'merge' | 'overwrite' | 'manual_review';
  status: 'pending' | 'resolved' | 'escalated';
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
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

// Graph metrics from API
export interface GraphMetrics {
  nodeCount: number;
  linkCount: number;
  density: number;
  averageDegree: number;
  clusters: number;
  claimCount?: number;
  evidenceCount?: number;
}

// Search facets from API
export interface SearchFacetsResult {
  types: Record<string, number>;
  status: Record<string, number>;
  tags: Array<{ name: string; count: number }>;
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
  // Enhanced collaboration state
  activeUsers: UserPresence[];
  comments: Comment[];
  validationResults: Record<string, ValidationResult>;
  changeHistory: ChangeEvent[];
  conflicts: ConflictResolution[];
  isConnected: boolean;
  reconnecting: boolean;
  editingClaim: string | null;
  notifications: Notification[];
  // Search state
  searchResults: SearchResult[];
  searchFacets: SearchFacetsResult | null;
  searchHistory: string[];
  // Graph state
  graphMetrics: GraphMetrics | null;
  currentProjectId: string | null;
}

export interface Notification {
  id: string;
  type: 'comment' | 'validation' | 'conflict' | 'mention' | 'system';
  title: string;
  message: string;
  userId: string;
  read: boolean;
  actionUrl?: string;
  createdAt: Date;
  priority: 'low' | 'medium' | 'high';
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

// Coverage visualization types
export interface LinkedEvidence {
  evidenceId: string;
  evidenceText: string;
  relationship: 'supports' | 'refutes' | 'partial_support' | 'partial_refute' | 'neutral';
  confidence: number;
  vectorScore?: number;
  rerankScore?: number;
  sourceUrl?: string;
  sourceTitle?: string;
}

export interface PremiseCoverage {
  stepNumber: number;
  premiseText: string;
  supportCount: number;
  refuteCount: number;
  neutralCount: number;
  hasEvidence: boolean;
  netSupport: number;
  totalEvidence: number;
  averageConfidence: number;
}

export interface CoverageSummary {
  totalPremises: number;
  withEvidence: number;
  supported: number;
  contested: number;
  mixed: number;
  noEvidence: number;
}

export interface CoverageData {
  chainId: string;
  coverage: PremiseCoverage[];
  summary: CoverageSummary;
}

export interface CoverageHeatmapProps {
  coverage: PremiseCoverage[];
  onPremiseClick: (stepNumber: number) => void;
  selectedStepNumber?: number;
  className?: string;
}

export interface EvidenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  premiseText: string;
  stepNumber: number;
  evidence: LinkedEvidence[];
  isLoading?: boolean;
}