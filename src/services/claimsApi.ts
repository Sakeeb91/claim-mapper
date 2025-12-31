import { apiService } from './api';
import { Claim, GraphLink } from '@/types';

/**
 * Relationship types between claims
 */
export type ClaimRelationship =
  | 'supports'
  | 'contradicts'
  | 'relates'
  | 'questions'
  | 'elaborates'
  | 'similar';

/**
 * Request body for relating claims
 */
export interface RelateClaimsRequest {
  claimIds: string[];
  relationship: ClaimRelationship;
  confidence: number;
  notes?: string;
}

/**
 * Response from the relate claims endpoint
 */
export interface RelateClaimsResponse {
  relationship: ClaimRelationship;
  claimIds: string[];
  confidence: number;
}

/**
 * Create relationship response with link data for optimistic updates
 */
export interface CreatedRelationship {
  id: string;
  source: string;
  target: string;
  type: ClaimRelationship;
  confidence: number;
  label?: string;
}

/**
 * Claims API service for managing claims and their relationships
 */
export class ClaimsApiService {
  /**
   * Create relationships between claims
   *
   * @param request - The relationship details
   * @returns The created relationship data
   */
  static async relateClaims(request: RelateClaimsRequest): Promise<RelateClaimsResponse> {
    const response = await apiService.post<RelateClaimsResponse>('/api/claims/relate', request);
    return response.data;
  }

  /**
   * Convenience method for connecting two nodes (claims)
   * This is the method used by the store's connectNodes action
   *
   * @param sourceId - Source claim ID
   * @param targetId - Target claim ID
   * @param relationship - Type of relationship
   * @param confidence - Confidence score (0-1)
   * @returns The created relationship data
   */
  static async connectClaims(
    sourceId: string,
    targetId: string,
    relationship: ClaimRelationship,
    confidence: number = 0.8
  ): Promise<RelateClaimsResponse> {
    return this.relateClaims({
      claimIds: [sourceId, targetId],
      relationship,
      confidence,
    });
  }

  /**
   * Get a single claim by ID
   *
   * @param claimId - The claim ID
   * @returns The claim data
   */
  static async getClaim(claimId: string): Promise<Claim> {
    const response = await apiService.get<Claim>(`/api/claims/${claimId}`);
    return response.data;
  }

  /**
   * Get all claims with optional filtering
   *
   * @param params - Query parameters for filtering
   * @returns Paginated claims response
   */
  static async getClaims(params?: {
    projectId?: string;
    type?: string;
    status?: string;
    minConfidence?: number;
    tags?: string[];
    search?: string;
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
  }): Promise<{
    claims: Claim[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const response = await apiService.getPaginated<Claim>('/api/claims', params);
    return {
      claims: response.data,
      pagination: response.pagination,
    };
  }

  /**
   * Create a new claim
   *
   * @param claimData - The claim data
   * @returns The created claim
   */
  static async createClaim(claimData: {
    text: string;
    type: 'hypothesis' | 'assertion' | 'question';
    confidence?: number;
    tags?: string[];
    project: string;
  }): Promise<Claim> {
    const response = await apiService.post<Claim>('/api/claims', claimData);
    return response.data;
  }

  /**
   * Update an existing claim
   *
   * @param claimId - The claim ID
   * @param updates - The fields to update
   * @returns The updated claim
   */
  static async updateClaim(claimId: string, updates: Partial<Claim>): Promise<Claim> {
    const response = await apiService.put<Claim>(`/api/claims/${claimId}`, updates);
    return response.data;
  }

  /**
   * Delete a claim (soft delete)
   *
   * @param claimId - The claim ID
   */
  static async deleteClaim(claimId: string): Promise<void> {
    await apiService.delete(`/api/claims/${claimId}`);
  }

  /**
   * Add evidence to a claim
   *
   * @param claimId - The claim ID
   * @param evidenceIds - Array of evidence IDs to add
   */
  static async addEvidence(claimId: string, evidenceIds: string[]): Promise<void> {
    await apiService.post(`/api/claims/${claimId}/evidence`, { evidenceIds });
  }

  /**
   * Add a comment to a claim
   *
   * @param claimId - The claim ID
   * @param text - Comment text
   */
  static async addComment(claimId: string, text: string): Promise<void> {
    await apiService.post(`/api/claims/${claimId}/comments`, { text });
  }

  /**
   * Get AI analysis for a claim
   *
   * @param claimId - The claim ID
   * @returns Analysis results from ML service
   */
  static async getClaimAnalysis(claimId: string): Promise<{
    quality: Record<string, unknown>;
    reasoning: Record<string, unknown>;
    timestamp: Date;
  }> {
    const response = await apiService.get<{
      quality: Record<string, unknown>;
      reasoning: Record<string, unknown>;
      timestamp: Date;
    }>(`/api/claims/${claimId}/analysis`);
    return response.data;
  }

  /**
   * Convert a created relationship to a GraphLink format
   * for optimistic updates in the graph visualization
   */
  static toGraphLink(
    sourceId: string,
    targetId: string,
    relationship: ClaimRelationship,
    confidence: number,
    tempId?: string
  ): GraphLink {
    return {
      id: tempId || `link_${Date.now()}`,
      source: sourceId,
      target: targetId,
      type: mapRelationshipToLinkType(relationship),
      strength: confidence,
      label: relationship,
    };
  }
}

/**
 * Map claim relationship types to graph link types
 */
function mapRelationshipToLinkType(
  relationship: ClaimRelationship
): 'supports' | 'contradicts' | 'relates' | 'reasoning' {
  switch (relationship) {
    case 'supports':
      return 'supports';
    case 'contradicts':
      return 'contradicts';
    case 'questions':
    case 'elaborates':
    case 'similar':
    case 'relates':
    default:
      return 'relates';
  }
}
