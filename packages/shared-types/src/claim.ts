/**
 * Claim Type Definitions
 */

export type ClaimType = 'assertion' | 'hypothesis' | 'question';

export type ClaimStatus = 'draft' | 'published' | 'archived' | 'deleted';

export interface Claim {
  id: string;
  text: string;
  type: ClaimType;
  confidence: number;
  status: ClaimStatus;
  tags: string[];
  domain?: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface ClaimInput {
  text: string;
  type: ClaimType;
  confidence?: number;
  tags?: string[];
  domain?: string;
}

export interface ClaimUpdate {
  text?: string;
  type?: ClaimType;
  confidence?: number;
  status?: ClaimStatus;
  tags?: string[];
  domain?: string;
}
