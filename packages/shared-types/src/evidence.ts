/**
 * Evidence Type Definitions
 */

export type EvidenceType = 'supports' | 'contradicts' | 'neutral';

export type EvidenceStatus = 'pending' | 'verified' | 'disputed' | 'rejected';

export interface Evidence {
  id: string;
  claimId: string;
  text: string;
  type: EvidenceType;
  status: EvidenceStatus;
  sources: string[];
  confidence: number;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface EvidenceInput {
  claimId: string;
  text: string;
  type: EvidenceType;
  sources?: string[];
  confidence?: number;
}

export interface EvidenceUpdate {
  text?: string;
  type?: EvidenceType;
  status?: EvidenceStatus;
  sources?: string[];
  confidence?: number;
}
