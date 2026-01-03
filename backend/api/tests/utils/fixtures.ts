/**
 * Test fixtures factory for generating consistent test data
 * Provides builders for User, Project, Claim, and Evidence models
 */

import { generateObjectId } from './testUtils';

// User fixtures
export interface UserFixture {
  _id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin' | 'researcher';
  isActive: boolean;
  isVerified: boolean;
  preferences: {
    theme: 'light' | 'dark';
    notifications: {
      email: boolean;
      push: boolean;
      collaboration: boolean;
    };
    privacy: {
      profileVisible: boolean;
      showActivity: boolean;
    };
  };
  profile: {
    bio?: string;
    organization?: string;
    department?: string;
    researchInterests: string[];
    socialLinks: {
      website?: string;
      twitter?: string;
      linkedin?: string;
      orcid?: string;
    };
  };
  stats: {
    claimsCreated: number;
    projectsCreated: number;
    collaborations: number;
    totalReasoningChains: number;
  };
  loginHistory: Array<{
    timestamp: Date;
    ip: string;
    userAgent: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export const createUserFixture = (overrides: Partial<UserFixture> = {}): UserFixture => ({
  _id: generateObjectId(),
  email: `test-${Date.now()}@example.com`,
  password: 'StrongP@ss123!',
  firstName: 'Test',
  lastName: 'User',
  role: 'user',
  isActive: true,
  isVerified: true,
  preferences: {
    theme: 'light',
    notifications: {
      email: true,
      push: true,
      collaboration: true,
    },
    privacy: {
      profileVisible: true,
      showActivity: true,
    },
  },
  profile: {
    bio: 'Test user bio',
    organization: 'Test Organization',
    department: 'Testing',
    researchInterests: ['testing', 'development'],
    socialLinks: {
      website: 'https://example.com',
    },
  },
  stats: {
    claimsCreated: 0,
    projectsCreated: 0,
    collaborations: 0,
    totalReasoningChains: 0,
  },
  loginHistory: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Project fixtures
export interface ProjectFixture {
  _id: string;
  name: string;
  description?: string;
  type: 'research' | 'education' | 'business' | 'personal';
  status: 'active' | 'completed' | 'archived' | 'paused';
  visibility: 'private' | 'team' | 'public';
  owner: string;
  collaborators: Array<{
    user: string;
    role: 'viewer' | 'editor' | 'admin';
    permissions: {
      canEdit: boolean;
      canDelete: boolean;
      canInvite: boolean;
      canExport: boolean;
      canManageSettings: boolean;
    };
    joinedAt: Date;
    invitedBy: string;
    lastActive?: Date;
  }>;
  settings: {
    claimValidation: {
      requireApproval: boolean;
      minimumConfidence: number;
      allowAutoExtraction: boolean;
    };
    reasoning: {
      enableAIGeneration: boolean;
      requireEvidence: boolean;
      allowPublicReview: boolean;
    };
    collaboration: {
      allowComments: boolean;
      allowVersioning: boolean;
      notifyOnChanges: boolean;
    };
  };
  tags: string[];
  categories: string[];
  statistics: {
    totalClaims: number;
    totalEvidence: number;
    totalReasoningChains: number;
    totalCollaborators: number;
    avgClaimQuality: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const createProjectFixture = (overrides: Partial<ProjectFixture> = {}): ProjectFixture => ({
  _id: generateObjectId(),
  name: 'Test Project',
  description: 'A test project for unit testing',
  type: 'research',
  status: 'active',
  visibility: 'private',
  owner: generateObjectId(),
  collaborators: [],
  settings: {
    claimValidation: {
      requireApproval: false,
      minimumConfidence: 0.5,
      allowAutoExtraction: true,
    },
    reasoning: {
      enableAIGeneration: true,
      requireEvidence: false,
      allowPublicReview: false,
    },
    collaboration: {
      allowComments: true,
      allowVersioning: true,
      notifyOnChanges: true,
    },
  },
  tags: ['test', 'sample'],
  categories: ['testing'],
  statistics: {
    totalClaims: 0,
    totalEvidence: 0,
    totalReasoningChains: 0,
    totalCollaborators: 0,
    avgClaimQuality: 0,
  },
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Claim fixtures
export interface ClaimFixture {
  _id: string;
  text: string;
  type: 'assertion' | 'question' | 'hypothesis' | 'conclusion' | 'assumption';
  source: {
    type: 'document' | 'url' | 'manual' | 'extracted';
    reference?: string;
    page?: number;
    section?: string;
    author?: string;
    title?: string;
    publishedDate?: Date;
  };
  confidence: number;
  position?: {
    start: number;
    end: number;
    paragraph?: number;
  };
  keywords: string[];
  tags: string[];
  evidence: string[];
  relatedClaims: Array<{
    claimId: string;
    relationship: 'supports' | 'contradicts' | 'questions' | 'elaborates' | 'similar';
    confidence: number;
    notes?: string;
  }>;
  quality: {
    overallScore: number;
    clarityScore: number;
    specificityScore: number;
    evidenceScore: number;
    biasScore: number;
    factualityScore: number;
    completenessScore: number;
    issues: string[];
    recommendations: string[];
  };
  project: string;
  creator: string;
  status: 'draft' | 'review' | 'approved' | 'rejected' | 'archived';
  isActive: boolean;
  versions: Array<{
    versionNumber: number;
    text: string;
    changedBy: string;
    changeReason?: string;
    timestamp: Date;
  }>;
  comments: Array<{
    user: string;
    text: string;
    timestamp: Date;
    resolved: boolean;
    replies: Array<{
      user: string;
      text: string;
      timestamp: Date;
    }>;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export const createClaimFixture = (overrides: Partial<ClaimFixture> = {}): ClaimFixture => ({
  _id: generateObjectId(),
  text: 'This is a test claim with sufficient length to pass validation requirements.',
  type: 'assertion',
  source: {
    type: 'manual',
    reference: 'Test reference',
    author: 'Test Author',
    title: 'Test Title',
  },
  confidence: 0.85,
  position: {
    start: 0,
    end: 100,
    paragraph: 1,
  },
  keywords: ['test', 'claim', 'sample'],
  tags: ['testing'],
  evidence: [],
  relatedClaims: [],
  quality: {
    overallScore: 0.8,
    clarityScore: 0.85,
    specificityScore: 0.75,
    evidenceScore: 0.7,
    biasScore: 0.9,
    factualityScore: 0.8,
    completenessScore: 0.75,
    issues: [],
    recommendations: [],
  },
  project: generateObjectId(),
  creator: generateObjectId(),
  status: 'draft',
  isActive: true,
  versions: [],
  comments: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Evidence fixtures
export interface EvidenceFixture {
  _id: string;
  text: string;
  type: 'empirical' | 'statistical' | 'testimonial' | 'expert' | 'documented' | 'anecdotal';
  source: {
    type: 'document' | 'url' | 'database' | 'survey' | 'interview' | 'observation';
    reference: string;
    author?: string;
    title?: string;
    publication?: string;
    publishedDate?: Date;
    accessedDate?: Date;
    doi?: string;
    url?: string;
    page?: number;
    section?: string;
  };
  reliability: {
    score: number;
    factors: {
      sourceCredibility: number;
      methodologyQuality: number;
      replication: number;
      peerReview: boolean;
      sampleSize?: number;
      biasAssessment: number;
    };
    notes?: string;
  };
  relevance: {
    score: number;
    contextual?: boolean;
    temporal?: boolean;
    geographical?: boolean;
    demographic?: boolean;
    notes?: string;
  };
  project: string;
  claims: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const createEvidenceFixture = (overrides: Partial<EvidenceFixture> = {}): EvidenceFixture => ({
  _id: generateObjectId(),
  text: 'This is test evidence text that provides supporting information for claims.',
  type: 'empirical',
  source: {
    type: 'document',
    reference: 'Test Reference 2024',
    author: 'Test Author',
    title: 'Test Evidence Title',
    publication: 'Test Journal',
    publishedDate: new Date(),
  },
  reliability: {
    score: 0.85,
    factors: {
      sourceCredibility: 0.9,
      methodologyQuality: 0.8,
      replication: 0.7,
      peerReview: true,
      sampleSize: 100,
      biasAssessment: 0.85,
    },
  },
  relevance: {
    score: 0.9,
    contextual: true,
    temporal: true,
    geographical: false,
    demographic: false,
  },
  project: generateObjectId(),
  claims: [],
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Collaborator fixture helper
export const createCollaboratorFixture = (
  userId: string,
  role: 'viewer' | 'editor' | 'admin' = 'viewer',
  invitedBy: string = generateObjectId()
) => ({
  user: userId,
  role,
  permissions: {
    canEdit: role === 'editor' || role === 'admin',
    canDelete: role === 'admin',
    canInvite: role === 'admin',
    canExport: true,
    canManageSettings: role === 'admin',
  },
  joinedAt: new Date(),
  invitedBy,
  lastActive: new Date(),
});

// Batch fixture creation
export const createUserFixtures = (count: number, overrides: Partial<UserFixture> = {}): UserFixture[] => {
  return Array.from({ length: count }, (_, i) =>
    createUserFixture({
      email: `test-user-${i}@example.com`,
      firstName: `Test${i}`,
      ...overrides,
    })
  );
};

export const createClaimFixtures = (
  count: number,
  projectId: string,
  creatorId: string,
  overrides: Partial<ClaimFixture> = {}
): ClaimFixture[] => {
  return Array.from({ length: count }, (_, i) =>
    createClaimFixture({
      text: `Test claim number ${i + 1} with sufficient length for validation.`,
      project: projectId,
      creator: creatorId,
      ...overrides,
    })
  );
};
