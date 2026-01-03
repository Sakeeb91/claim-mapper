/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { Document, Schema } from 'mongoose';

export interface IProject extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  type: 'research' | 'education' | 'business' | 'personal';
  status: 'active' | 'completed' | 'archived' | 'paused';
  visibility: 'private' | 'team' | 'public';
  owner: mongoose.Types.ObjectId; // Reference to User
  collaborators: Array<{
    user: mongoose.Types.ObjectId;
    role: 'viewer' | 'editor' | 'admin';
    permissions: {
      canEdit: boolean;
      canDelete: boolean;
      canInvite: boolean;
      canExport: boolean;
      canManageSettings: boolean;
    };
    joinedAt: Date;
    invitedBy: mongoose.Types.ObjectId;
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
    export: {
      allowedFormats: string[];
      includeMetadata: boolean;
      includeVersionHistory: boolean;
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
    lastAnalyzed?: Date;
  };
  documents: Array<{
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    path: string;
    uploadedBy: mongoose.Types.ObjectId;
    uploadedAt: Date;
    processed: boolean;
    extractedClaims: number;
    metadata?: any;
  }>;
  milestones: Array<{
    title: string;
    description?: string;
    dueDate?: Date;
    completedAt?: Date;
    assignedTo: mongoose.Types.ObjectId[];
    status: 'pending' | 'in-progress' | 'completed' | 'overdue';
    priority: 'low' | 'medium' | 'high' | 'critical';
  }>;
  workflow: {
    stages: Array<{
      name: string;
      description?: string;
      order: number;
      requirements: string[];
      autoAdvance: boolean;
    }>;
    currentStage?: number;
    completedStages: number[];
  };
  template?: {
    isTemplate: boolean;
    templateName?: string;
    templateDescription?: string;
    useCount: number;
  };
  integration: {
    connectedServices: Array<{
      service: string;
      credentials?: any;
      lastSync?: Date;
      status: 'active' | 'inactive' | 'error';
    }>;
    webhooks: Array<{
      url: string;
      events: string[];
      secret?: string;
      active: boolean;
    }>;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Methods
  hasPermission(userId: string, permission: string): boolean;
  addCollaborator(userId: string, role: string, invitedBy: string): Promise<IProject>;
  removeCollaborator(userId: string): Promise<IProject>;
}

const projectSchema = new Schema<IProject>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    index: true,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000,
  },
  type: {
    type: String,
    enum: ['research', 'education', 'business', 'personal'],
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'archived', 'paused'],
    default: 'active',
    index: true,
  },
  visibility: {
    type: String,
    enum: ['private', 'team', 'public'],
    default: 'private',
    index: true,
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  collaborators: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['viewer', 'editor', 'admin'],
      default: 'viewer',
    },
    permissions: {
      canEdit: { type: Boolean, default: false },
      canDelete: { type: Boolean, default: false },
      canInvite: { type: Boolean, default: false },
      canExport: { type: Boolean, default: true },
      canManageSettings: { type: Boolean, default: false },
    },
    joinedAt: { type: Date, default: Date.now },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastActive: Date,
  }],
  settings: {
    claimValidation: {
      requireApproval: { type: Boolean, default: false },
      minimumConfidence: { type: Number, default: 0.5, min: 0, max: 1 },
      allowAutoExtraction: { type: Boolean, default: true },
    },
    reasoning: {
      enableAIGeneration: { type: Boolean, default: true },
      requireEvidence: { type: Boolean, default: false },
      allowPublicReview: { type: Boolean, default: false },
    },
    collaboration: {
      allowComments: { type: Boolean, default: true },
      allowVersioning: { type: Boolean, default: true },
      notifyOnChanges: { type: Boolean, default: true },
    },
    export: {
      allowedFormats: {
        type: [String],
        default: ['json', 'csv', 'pdf'],
        enum: ['json', 'csv', 'pdf', 'docx', 'xlsx'],
      },
      includeMetadata: { type: Boolean, default: true },
      includeVersionHistory: { type: Boolean, default: false },
    },
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 30,
  }],
  categories: [{
    type: String,
    trim: true,
    maxlength: 50,
  }],
  statistics: {
    totalClaims: { type: Number, default: 0 },
    totalEvidence: { type: Number, default: 0 },
    totalReasoningChains: { type: Number, default: 0 },
    totalCollaborators: { type: Number, default: 0 },
    avgClaimQuality: { type: Number, default: 0, min: 0, max: 1 },
    lastAnalyzed: Date,
  },
  documents: [{
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    uploadedAt: { type: Date, default: Date.now },
    processed: { type: Boolean, default: false },
    extractedClaims: { type: Number, default: 0 },
    metadata: Schema.Types.Mixed,
  }],
  milestones: [{
    title: { type: String, required: true, maxlength: 100 },
    description: { type: String, maxlength: 500 },
    dueDate: Date,
    completedAt: Date,
    assignedTo: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'overdue'],
      default: 'pending',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
  }],
  workflow: {
    stages: [{
      name: { type: String, required: true },
      description: String,
      order: { type: Number, required: true },
      requirements: [String],
      autoAdvance: { type: Boolean, default: false },
    }],
    currentStage: Number,
    completedStages: [Number],
  },
  template: {
    isTemplate: { type: Boolean, default: false },
    templateName: String,
    templateDescription: String,
    useCount: { type: Number, default: 0 },
  },
  integration: {
    connectedServices: [{
      service: { type: String, required: true },
      credentials: Schema.Types.Mixed,
      lastSync: Date,
      status: {
        type: String,
        enum: ['active', 'inactive', 'error'],
        default: 'inactive',
      },
    }],
    webhooks: [{
      url: { type: String, required: true },
      events: [String],
      secret: String,
      active: { type: Boolean, default: true },
    }],
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for performance
projectSchema.index({ owner: 1, status: 1 });
projectSchema.index({ 'collaborators.user': 1 });
projectSchema.index({ type: 1, status: 1 });
projectSchema.index({ visibility: 1, isActive: 1 });
projectSchema.index({ tags: 1 });
projectSchema.index({ categories: 1 });
projectSchema.index({ createdAt: -1 });
projectSchema.index({ updatedAt: -1 });

// Text search index
projectSchema.index({
  name: 'text',
  description: 'text',
  tags: 'text',
  categories: 'text',
}, {
  weights: {
    name: 10,
    description: 5,
    tags: 3,
    categories: 2,
  },
  name: 'project_text_search',
});

// Virtual for total collaborators count
projectSchema.virtual('collaboratorCount').get(function() {
  return this.collaborators.length + 1; // +1 for owner
});

// Virtual for completion percentage
projectSchema.virtual('completionPercentage').get(function() {
  if (!this.workflow.stages.length) return 0;
  return (this.workflow.completedStages.length / this.workflow.stages.length) * 100;
});

// Virtual for active milestones
projectSchema.virtual('activeMilestones').get(function() {
  return this.milestones.filter(m => m.status !== 'completed').length;
});

// Pre-save middleware to update statistics
projectSchema.pre('save', function(next) {
  // Update collaborator count
  this.statistics.totalCollaborators = this.collaborators.length;
  
  // Check for overdue milestones
  const now = new Date();
  this.milestones.forEach(milestone => {
    if (milestone.dueDate && 
        milestone.dueDate < now && 
        milestone.status !== 'completed') {
      milestone.status = 'overdue';
    }
  });
  
  next();
});

// Static methods
projectSchema.statics.findByUser = function(userId: string, role?: string) {
  const query: any = {
    $or: [
      { owner: userId },
      { 'collaborators.user': userId },
    ],
    isActive: true,
  };
  
  if (role) {
    query.$or[1]['collaborators.role'] = role;
  }
  
  return this.find(query)
    .populate('owner', 'firstName lastName email')
    .populate('collaborators.user', 'firstName lastName email')
    .sort({ updatedAt: -1 });
};

projectSchema.statics.findPublic = function(limit: number = 20) {
  return this.find({ 
    visibility: 'public', 
    isActive: true,
    status: { $in: ['active', 'completed'] }
  })
    .populate('owner', 'firstName lastName email')
    .sort({ updatedAt: -1 })
    .limit(limit);
};

projectSchema.statics.searchProjects = function(query: string, userId?: string) {
  const searchConditions: any = {
    $text: { $search: query },
    isActive: true,
  };
  
  if (userId) {
    searchConditions.$or = [
      { owner: userId },
      { 'collaborators.user': userId },
      { visibility: 'public' },
    ];
  } else {
    searchConditions.visibility = 'public';
  }
  
  return this.find(searchConditions, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .populate('owner', 'firstName lastName email');
};

// Instance methods
projectSchema.methods.addCollaborator = function(userId: string, role: string, invitedBy: string) {
  const existingCollaborator = this.collaborators.find((c: IProject['collaborators'][0]) =>
    c.user.toString() === userId.toString()
  );
  
  if (existingCollaborator) {
    throw new Error('User is already a collaborator');
  }
  
  const permissions = {
    canEdit: role === 'editor' || role === 'admin',
    canDelete: role === 'admin',
    canInvite: role === 'admin',
    canExport: true,
    canManageSettings: role === 'admin',
  };
  
  this.collaborators.push({
    user: userId,
    role,
    permissions,
    joinedAt: new Date(),
    invitedBy,
  });
  
  return this.save();
};

projectSchema.methods.removeCollaborator = function(userId: string) {
  this.collaborators = this.collaborators.filter((c: IProject['collaborators'][0]) =>
    c.user.toString() !== userId.toString()
  );
  return this.save();
};

projectSchema.methods.hasPermission = function(userId: string, permission: string): boolean {
  // Owner has all permissions
  if (this.owner.toString() === userId.toString()) {
    return true;
  }

  const collaborator = this.collaborators.find((c: IProject['collaborators'][0]) =>
    c.user.toString() === userId.toString()
  );
  
  if (!collaborator) {
    return false;
  }
  
  return collaborator.permissions[permission] || false;
};

export default mongoose.model<IProject>('Project', projectSchema);