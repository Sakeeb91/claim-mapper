import { apiService } from './api';
import { GraphData, GraphNode, GraphLink } from '@/types';

/**
 * Graph metrics returned from the API
 */
export interface GraphMetrics {
  nodeCount: number;
  linkCount: number;
  density: number;
  averageDegree: number;
  clusters: number;
  claimCount?: number;
  evidenceCount?: number;
}

/**
 * Full graph response including metrics
 */
export interface GraphResponse {
  nodes: GraphNode[];
  links: GraphLink[];
  metrics: GraphMetrics;
}

/**
 * Query parameters for fetching graph data
 */
export interface GraphQueryParams {
  projectId?: string;
  claimIds?: string[];
  maxDepth?: number;
  includeEvidence?: boolean;
  includeReasoning?: boolean;
  minConfidence?: number;
  types?: ('claim' | 'evidence' | 'reasoning')[];
  limit?: number;
}

/**
 * Graph API service for fetching and managing graph data
 */
export class GraphApiService {
  /**
   * Fetch graph data for a project or set of claims
   *
   * @param params - Query parameters for filtering graph data
   * @returns Graph data including nodes, links, and metrics
   */
  static async getGraphData(params: GraphQueryParams): Promise<GraphResponse> {
    const queryParams: Record<string, unknown> = {};

    if (params.projectId) {
      queryParams.projectId = params.projectId;
    }
    if (params.claimIds && params.claimIds.length > 0) {
      queryParams.claimIds = params.claimIds;
    }
    if (params.maxDepth !== undefined) {
      queryParams.maxDepth = params.maxDepth;
    }
    if (params.includeEvidence !== undefined) {
      queryParams.includeEvidence = params.includeEvidence;
    }
    if (params.includeReasoning !== undefined) {
      queryParams.includeReasoning = params.includeReasoning;
    }
    if (params.minConfidence !== undefined) {
      queryParams.minConfidence = params.minConfidence;
    }
    if (params.types && params.types.length > 0) {
      queryParams.types = params.types;
    }
    if (params.limit !== undefined) {
      queryParams.limit = params.limit;
    }

    const response = await apiService.get<GraphResponse>('/api/graph', {
      params: queryParams,
    });

    return response.data;
  }

  /**
   * Fetch graph data centered on a specific claim
   *
   * @param claimId - The claim ID to center the graph on
   * @param maxDepth - Maximum depth for relationship traversal
   * @param includeEvidence - Whether to include evidence nodes
   * @returns Graph data centered on the claim
   */
  static async getClaimGraph(
    claimId: string,
    maxDepth: number = 2,
    includeEvidence: boolean = true
  ): Promise<GraphResponse> {
    const response = await apiService.get<GraphResponse>(`/api/graph/claim/${claimId}`, {
      params: { maxDepth, includeEvidence },
    });

    return response.data;
  }

  /**
   * Fetch graph metrics for a project (faster than full graph)
   *
   * @param projectId - The project ID to get metrics for
   * @returns Graph metrics and central nodes
   */
  static async getGraphMetrics(projectId: string): Promise<{
    metrics: GraphMetrics & { claimCount: number; evidenceCount: number };
    centralNodes: Array<{ id: string; type: string; degree: number }>;
    timestamp: Date;
  }> {
    const response = await apiService.get<{
      metrics: GraphMetrics & { claimCount: number; evidenceCount: number };
      centralNodes: Array<{ id: string; type: string; degree: number }>;
      timestamp: Date;
    }>(`/api/graph/metrics/${projectId}`);

    return response.data;
  }

  /**
   * Clear graph cache for a project
   *
   * @param projectId - The project ID to clear cache for
   */
  static async clearGraphCache(projectId: string): Promise<void> {
    await apiService.delete(`/api/graph/cache/${projectId}`);
  }

  /**
   * Transform API graph response to frontend GraphData format
   * This normalizes the data structure for D3.js consumption
   */
  static normalizeGraphData(response: GraphResponse): GraphData {
    return {
      nodes: response.nodes.map((node) => ({
        ...node,
        // Ensure required fields have defaults
        size: node.size || 20,
        color: node.color || getNodeColor(node.type),
        confidence: node.confidence ?? (node.data as any)?.confidence ?? 0.5,
      })),
      links: response.links.map((link) => ({
        ...link,
        // Normalize source/target to string IDs
        source: typeof link.source === 'object' ? (link.source as GraphNode).id : link.source,
        target: typeof link.target === 'object' ? (link.target as GraphNode).id : link.target,
        strength: link.strength ?? 0.5,
      })),
    };
  }
}

/**
 * Get default node color based on type
 */
function getNodeColor(type: 'claim' | 'evidence' | 'reasoning'): string {
  const colors = {
    claim: '#3b82f6',     // Blue
    evidence: '#10b981',  // Green
    reasoning: '#8b5cf6', // Purple
  };
  return colors[type] || '#6b7280'; // Gray fallback
}
