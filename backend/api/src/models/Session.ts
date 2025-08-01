import mongoose, { Document, Schema } from 'mongoose';

export interface ISession extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId; // Reference to User
  project: mongoose.Types.ObjectId; // Reference to Project
  type: 'collaborative' | 'individual' | 'review' | 'analysis';
  status: 'active' | 'completed' | 'paused' | 'terminated';
  participants: Array<{
    user: mongoose.Types.ObjectId;
    role: 'host' | 'participant' | 'observer';
    joinedAt: Date;
    leftAt?: Date;
    isActive: boolean;
    permissions: {
      canEdit: boolean;
      canComment: boolean;
      canPresent: boolean;
      canModerate: boolean;
    };
  }>;
  activities: Array<{
    timestamp: Date;
    user: mongoose.Types.ObjectId;
    action: 'join' | 'leave' | 'edit_claim' | 'add_evidence' | 'create_reasoning' | 'comment' | 'review' | 'vote';
    target: {
      type: 'claim' | 'evidence' | 'reasoning_chain' | 'project' | 'session';
      id: mongoose.Types.ObjectId;
    };
    details: any; // Specific action details
    undoable: boolean;
  }>;
  changes: Array<{
    timestamp: Date;
    user: mongoose.Types.ObjectId;
    changeType: 'create' | 'update' | 'delete' | 'restore';
    entity: {
      type: 'claim' | 'evidence' | 'reasoning_chain';
      id: mongoose.Types.ObjectId;
    };
    before?: any; // Previous state
    after?: any; // New state
    synchronized: boolean; // Whether change has been synced to all participants
  }>;
  realTimeData: {
    cursors: Map<string, { // userId -> cursor position
      x: number;
      y: number;
      element?: string;
      timestamp: Date;
    }>;
    selections: Map<string, { // userId -> current selection
      elementType: string;
      elementId: string;
      startPos?: number;
      endPos?: number;
      timestamp: Date;
    }>;
    activeEditors: Map<string, { // elementId -> userId currently editing
      user: mongoose.Types.ObjectId;
      startedAt: Date;
      lockType: 'soft' | 'hard';
    }>;
  };
  communication: {
    chat: Array<{
      user: mongoose.Types.ObjectId;
      message: string;
      timestamp: Date;
      type: 'text' | 'system' | 'notification';
      edited?: boolean;
      editedAt?: Date;
    }>;
    voiceCall: {
      active: boolean;
      participants: mongoose.Types.ObjectId[];
      startedAt?: Date;
      recordingEnabled?: boolean;
    };
    screenShare: {
      active: boolean;
      presenter: mongoose.Types.ObjectId;
      startedAt?: Date;
      viewers: mongoose.Types.ObjectId[];
    };
  };
  settings: {
    visibility: 'private' | 'team' | 'public';
    recording: {
      enabled: boolean;
      recordChanges: boolean;
      recordChat: boolean;
      recordVoice: boolean;
    };
    notifications: {
      onJoin: boolean;
      onLeave: boolean;
      onEdit: boolean;
      onComment: boolean;
    };
    collaboration: {
      maxParticipants: number;
      requireApproval: boolean;
      allowAnonymous: boolean;
      enableVoting: boolean;
    };
  };
  metadata: {
    title?: string;
    description?: string;
    agenda?: string[];
    objectives?: string[];
    outcomes?: string[];
    tags: string[];
    scheduledStart?: Date;
    scheduledEnd?: Date;
    actualDuration?: number; // in minutes
  };
  quality: {
    productivityScore: number; // 0-1 based on meaningful changes
    collaborationScore: number; // 0-1 based on participant engagement
    consensusScore: number; // 0-1 based on agreement levels
    completionScore: number; // 0-1 based on objectives met
  };
  outcomes: {
    claimsCreated: number;
    claimsModified: number;
    evidenceAdded: number;
    reasoningChainsGenerated: number;
    consensusReached: string[]; // List of items with consensus
    actionItems: Array<{
      description: string;
      assignedTo: mongoose.Types.ObjectId;
      priority: 'low' | 'medium' | 'high';
      dueDate?: Date;
      completed: boolean;
    }>;
  };
  recording: {
    enabled: boolean;
    startedAt?: Date;
    stoppedAt?: Date;
    fileSize?: number;
    filePath?: string;
    transcript?: string;
    keyMoments: Array<{
      timestamp: Date;
      type: 'decision' | 'consensus' | 'conflict' | 'insight';
      description: string;
      participants: mongoose.Types.ObjectId[];
    }>;
  };
  isActive: boolean;
  startedAt: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISession>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['collaborative', 'individual', 'review', 'analysis'],
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'paused', 'terminated'],
    default: 'active',
    index: true,
  },
  participants: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['host', 'participant', 'observer'],
      required: true,
    },
    joinedAt: { type: Date, default: Date.now },
    leftAt: Date,
    isActive: { type: Boolean, default: true },
    permissions: {
      canEdit: { type: Boolean, default: true },
      canComment: { type: Boolean, default: true },
      canPresent: { type: Boolean, default: false },
      canModerate: { type: Boolean, default: false },
    },
  }],
  activities: [{
    timestamp: { type: Date, default: Date.now },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: ['join', 'leave', 'edit_claim', 'add_evidence', 'create_reasoning', 'comment', 'review', 'vote'],
      required: true,
    },
    target: {
      type: {
        type: String,
        enum: ['claim', 'evidence', 'reasoning_chain', 'project', 'session'],
        required: true,
      },
      id: {
        type: Schema.Types.ObjectId,
        required: true,
      },
    },
    details: Schema.Types.Mixed,
    undoable: { type: Boolean, default: false },
  }],
  changes: [{
    timestamp: { type: Date, default: Date.now },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    changeType: {
      type: String,
      enum: ['create', 'update', 'delete', 'restore'],
      required: true,
    },
    entity: {
      type: {
        type: String,
        enum: ['claim', 'evidence', 'reasoning_chain'],
        required: true,
      },
      id: {
        type: Schema.Types.ObjectId,
        required: true,
      },
    },
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed,
    synchronized: { type: Boolean, default: false },
  }],
  realTimeData: {
    cursors: {
      type: Map,
      of: {
        x: Number,
        y: Number,
        element: String,
        timestamp: Date,
      },
      default: new Map(),
    },
    selections: {
      type: Map,
      of: {
        elementType: String,
        elementId: String,
        startPos: Number,
        endPos: Number,
        timestamp: Date,
      },
      default: new Map(),
    },
    activeEditors: {
      type: Map,
      of: {
        user: Schema.Types.ObjectId,
        startedAt: Date,
        lockType: {
          type: String,
          enum: ['soft', 'hard'],
          default: 'soft',
        },
      },
      default: new Map(),
    },
  },
  communication: {
    chat: [{
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      message: { type: String, required: true, maxlength: 1000 },
      timestamp: { type: Date, default: Date.now },
      type: {
        type: String,
        enum: ['text', 'system', 'notification'],
        default: 'text',
      },
      edited: { type: Boolean, default: false },
      editedAt: Date,
    }],
    voiceCall: {
      active: { type: Boolean, default: false },
      participants: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
      }],
      startedAt: Date,
      recordingEnabled: { type: Boolean, default: false },
    },
    screenShare: {
      active: { type: Boolean, default: false },
      presenter: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      startedAt: Date,
      viewers: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
      }],
    },
  },
  settings: {
    visibility: {
      type: String,
      enum: ['private', 'team', 'public'],
      default: 'private',
    },
    recording: {
      enabled: { type: Boolean, default: false },
      recordChanges: { type: Boolean, default: true },
      recordChat: { type: Boolean, default: false },
      recordVoice: { type: Boolean, default: false },
    },
    notifications: {
      onJoin: { type: Boolean, default: true },
      onLeave: { type: Boolean, default: true },
      onEdit: { type: Boolean, default: true },
      onComment: { type: Boolean, default: true },
    },
    collaboration: {
      maxParticipants: { type: Number, default: 10, min: 1, max: 50 },
      requireApproval: { type: Boolean, default: false },
      allowAnonymous: { type: Boolean, default: false },
      enableVoting: { type: Boolean, default: true },
    },
  },
  metadata: {
    title: { type: String, maxlength: 100 },
    description: { type: String, maxlength: 500 },
    agenda: [String],
    objectives: [String],
    outcomes: [String],
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    scheduledStart: Date,
    scheduledEnd: Date,
    actualDuration: Number,
  },
  quality: {
    productivityScore: { type: Number, min: 0, max: 1, default: 0 },
    collaborationScore: { type: Number, min: 0, max: 1, default: 0 },
    consensusScore: { type: Number, min: 0, max: 1, default: 0 },
    completionScore: { type: Number, min: 0, max: 1, default: 0 },
  },
  outcomes: {
    claimsCreated: { type: Number, default: 0 },
    claimsModified: { type: Number, default: 0 },
    evidenceAdded: { type: Number, default: 0 },
    reasoningChainsGenerated: { type: Number, default: 0 },
    consensusReached: [String],
    actionItems: [{
      description: { type: String, required: true },
      assignedTo: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium',
      },
      dueDate: Date,
      completed: { type: Boolean, default: false },
    }],
  },
  recording: {
    enabled: { type: Boolean, default: false },
    startedAt: Date,
    stoppedAt: Date,
    fileSize: Number,
    filePath: String,
    transcript: String,
    keyMoments: [{
      timestamp: { type: Date, required: true },
      type: {
        type: String,
        enum: ['decision', 'consensus', 'conflict', 'insight'],
        required: true,
      },
      description: { type: String, required: true },
      participants: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
      }],
    }],
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  startedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  endedAt: Date,
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Compound indexes for performance
sessionSchema.index({ project: 1, status: 1 });
sessionSchema.index({ user: 1, status: 1 });
sessionSchema.index({ 'participants.user': 1, status: 1 });
sessionSchema.index({ type: 1, status: 1 });
sessionSchema.index({ startedAt: -1, endedAt: -1 });
sessionSchema.index({ 'metadata.tags': 1 });

// Virtual for duration
sessionSchema.virtual('duration').get(function() {
  if (!this.endedAt) {
    return Math.floor((Date.now() - this.startedAt.getTime()) / 1000 / 60); // minutes
  }
  return Math.floor((this.endedAt.getTime() - this.startedAt.getTime()) / 1000 / 60);
});

// Virtual for active participant count
sessionSchema.virtual('activeParticipantCount').get(function() {
  return this.participants.filter(p => p.isActive).length;
});

// Virtual for total activities
sessionSchema.virtual('activityCount').get(function() {
  return this.activities.length;
});

// Virtual for change count
sessionSchema.virtual('changeCount').get(function() {
  return this.changes.length;
});

// Pre-save middleware to update quality scores and outcomes
sessionSchema.pre('save', function(next) {
  // Calculate actual duration if session is completed
  if (this.status === 'completed' && this.endedAt) {
    this.metadata.actualDuration = Math.floor(
      (this.endedAt.getTime() - this.startedAt.getTime()) / 1000 / 60
    );
  }
  
  // Update outcome counts based on activities
  const createClaimActivities = this.activities.filter(a => 
    a.action === 'edit_claim' && a.target.type === 'claim'
  );
  this.outcomes.claimsCreated = createClaimActivities.length;
  this.outcomes.claimsModified = this.activities.filter(a => 
    a.action === 'edit_claim'
  ).length;
  this.outcomes.evidenceAdded = this.activities.filter(a => 
    a.action === 'add_evidence'
  ).length;
  this.outcomes.reasoningChainsGenerated = this.activities.filter(a => 
    a.action === 'create_reasoning'
  ).length;
  
  // Calculate quality scores
  const totalTime = this.duration || 1;
  const meaningfulChanges = this.changes.filter(c => 
    c.changeType === 'create' || c.changeType === 'update'
  ).length;
  this.quality.productivityScore = Math.min(1, meaningfulChanges / totalTime * 10);
  
  const activeParticipants = this.participants.filter(p => p.isActive).length;
  this.quality.collaborationScore = Math.min(1, activeParticipants / 5);
  
  next();
});

// Static methods
sessionSchema.statics.findByProject = function(projectId: string, filters: any = {}) {
  return this.find({ project: projectId, isActive: true, ...filters })
    .populate('user', 'firstName lastName email')
    .populate('participants.user', 'firstName lastName email')
    .sort({ startedAt: -1 });
};

sessionSchema.statics.findActive = function(userId?: string) {
  const query: any = { status: 'active', isActive: true };
  if (userId) {
    query.$or = [
      { user: userId },
      { 'participants.user': userId },
    ];
  }
  
  return this.find(query)
    .populate('user', 'firstName lastName email')
    .populate('project', 'name')
    .populate('participants.user', 'firstName lastName email')
    .sort({ startedAt: -1 });
};

sessionSchema.statics.findByUser = function(userId: string, includeCompleted: boolean = false) {
  const statusFilter = includeCompleted ? 
    { status: { $in: ['active', 'completed', 'paused'] } } : 
    { status: 'active' };
  
  return this.find({
    $or: [
      { user: userId },
      { 'participants.user': userId },
    ],
    isActive: true,
    ...statusFilter,
  })
    .populate('user', 'firstName lastName email')
    .populate('project', 'name')
    .populate('participants.user', 'firstName lastName email')
    .sort({ startedAt: -1 });
};

// Instance methods
sessionSchema.methods.addParticipant = function(userId: string, role: string = 'participant') {
  const existingParticipant = this.participants.find(p => 
    p.user.toString() === userId.toString()
  );
  
  if (existingParticipant) {
    if (!existingParticipant.isActive) {
      existingParticipant.isActive = true;
      existingParticipant.joinedAt = new Date();
      existingParticipant.leftAt = undefined;
    }
    return this.save();
  }
  
  const permissions = {
    canEdit: role !== 'observer',
    canComment: true,
    canPresent: role === 'host',
    canModerate: role === 'host',
  };
  
  this.participants.push({
    user: userId,
    role,
    joinedAt: new Date(),
    isActive: true,
    permissions,
  });
  
  // Add join activity
  this.activities.push({
    timestamp: new Date(),
    user: userId,
    action: 'join',
    target: { type: 'session', id: this._id },
    details: { role },
    undoable: false,
  });
  
  return this.save();
};

sessionSchema.methods.removeParticipant = function(userId: string) {
  const participant = this.participants.find(p => 
    p.user.toString() === userId.toString()
  );
  
  if (participant) {
    participant.isActive = false;
    participant.leftAt = new Date();
    
    // Add leave activity
    this.activities.push({
      timestamp: new Date(),
      user: userId,
      action: 'leave',
      target: { type: 'session', id: this._id },
      details: {},
      undoable: false,
    });
  }
  
  return this.save();
};

sessionSchema.methods.addActivity = function(userId: string, action: string, target: any, details: any = {}) {
  this.activities.push({
    timestamp: new Date(),
    user: userId,
    action,
    target,
    details,
    undoable: ['edit_claim', 'add_evidence', 'create_reasoning'].includes(action),
  });
  
  return this.save();
};

sessionSchema.methods.addChange = function(userId: string, changeType: string, entity: any, before?: any, after?: any) {
  this.changes.push({
    timestamp: new Date(),
    user: userId,
    changeType,
    entity,
    before,
    after,
    synchronized: false,
  });
  
  return this.save();
};

sessionSchema.methods.addChatMessage = function(userId: string, message: string, type: 'text' | 'system' | 'notification' = 'text') {
  this.communication.chat.push({
    user: userId,
    message,
    timestamp: new Date(),
    type,
  });
  
  return this.save();
};

sessionSchema.methods.endSession = function() {
  this.status = 'completed';
  this.endedAt = new Date();
  
  // Mark all participants as inactive
  this.participants.forEach(participant => {
    if (participant.isActive) {
      participant.isActive = false;
      participant.leftAt = new Date();
    }
  });
  
  return this.save();
};

export default mongoose.model<ISession>('Session', sessionSchema);