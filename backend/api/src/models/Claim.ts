import mongoose, { Document, Schema } from 'mongoose';

export interface IClaim extends Document {
  _id: mongoose.Types.ObjectId;
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
  entities: Array<{
    text: string;
    type: string;
    confidence: number;
    position: {
      start: number;
      end: number;
    };
  }>;
  evidence: mongoose.Types.ObjectId[]; // References to Evidence documents
  relatedClaims: Array<{
    claimId: mongoose.Types.ObjectId;
    relationship: 'supports' | 'contradicts' | 'questions' | 'elaborates' | 'similar';
    confidence: number;
    notes?: string;
  }>;
  reasoningChains: mongoose.Types.ObjectId[]; // References to ReasoningChain documents
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
  metadata: {
    extractionModel?: string;
    extractionVersion?: string;
    processingDate: Date;
    lastAnalyzed?: Date;
    analysisVersion?: string;
  };
  tags: string[];
  project: mongoose.Types.ObjectId; // Reference to Project
  creator: mongoose.Types.ObjectId; // Reference to User
  collaborators: Array<{
    user: mongoose.Types.ObjectId;
    role: 'viewer' | 'editor' | 'reviewer';
    addedAt: Date;
    addedBy: mongoose.Types.ObjectId;
  }>;
  status: 'draft' | 'review' | 'approved' | 'rejected' | 'archived';
  versions: Array<{
    versionNumber: number;
    text: string;
    changedBy: mongoose.Types.ObjectId;
    changeReason?: string;
    timestamp: Date;
  }>;
  comments: Array<{
    user: mongoose.Types.ObjectId;
    text: string;
    timestamp: Date;
    resolved: boolean;
    replies: Array<{
      user: mongoose.Types.ObjectId;
      text: string;
      timestamp: Date;
    }>;
  }>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const claimSchema = new Schema<IClaim>({
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
    index: 'text', // Text search index
  },
  type: {
    type: String,
    enum: ['assertion', 'question', 'hypothesis', 'conclusion', 'assumption'],
    required: true,
    index: true,
  },
  source: {
    type: {
      type: String,
      enum: ['document', 'url', 'manual', 'extracted'],
      required: true,
    },
    reference: String,
    page: Number,
    section: String,
    author: String,
    title: String,
    publishedDate: Date,
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
    index: true,
  },
  position: {
    start: { type: Number, required: true },
    end: { type: Number, required: true },
    paragraph: Number,
  },
  keywords: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  entities: [{
    text: { type: String, required: true },
    type: { type: String, required: true },
    confidence: { type: Number, min: 0, max: 1 },
    position: {
      start: { type: Number, required: true },
      end: { type: Number, required: true },
    },
  }],
  evidence: [{
    type: Schema.Types.ObjectId,
    ref: 'Evidence',
  }],
  relatedClaims: [{
    claimId: {
      type: Schema.Types.ObjectId,
      ref: 'Claim',
      required: true,
    },
    relationship: {
      type: String,
      enum: ['supports', 'contradicts', 'questions', 'elaborates', 'similar'],
      required: true,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      required: true,
    },
    notes: String,
  }],
  reasoningChains: [{
    type: Schema.Types.ObjectId,
    ref: 'ReasoningChain',
  }],
  quality: {
    overallScore: { type: Number, min: 0, max: 1, default: 0 },
    clarityScore: { type: Number, min: 0, max: 1, default: 0 },
    specificityScore: { type: Number, min: 0, max: 1, default: 0 },
    evidenceScore: { type: Number, min: 0, max: 1, default: 0 },
    biasScore: { type: Number, min: 0, max: 1, default: 0 },
    factualityScore: { type: Number, min: 0, max: 1, default: 0 },
    completenessScore: { type: Number, min: 0, max: 1, default: 0 },
    issues: [String],
    recommendations: [String],
  },
  metadata: {
    extractionModel: String,
    extractionVersion: String,
    processingDate: { type: Date, default: Date.now },
    lastAnalyzed: Date,
    analysisVersion: String,
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 30,
  }],
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true,
  },
  creator: {
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
      enum: ['viewer', 'editor', 'reviewer'],
      default: 'viewer',
    },
    addedAt: { type: Date, default: Date.now },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  }],
  status: {
    type: String,
    enum: ['draft', 'review', 'approved', 'rejected', 'archived'],
    default: 'draft',
    index: true,
  },
  versions: [{
    versionNumber: { type: Number, required: true },
    text: { type: String, required: true },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    changeReason: String,
    timestamp: { type: Date, default: Date.now },
  }],
  comments: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: { type: String, required: true, maxlength: 1000 },
    timestamp: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false },
    replies: [{
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      text: { type: String, required: true, maxlength: 500 },
      timestamp: { type: Date, default: Date.now },
    }],
  }],
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

// Compound indexes for performance
claimSchema.index({ project: 1, creator: 1 });
claimSchema.index({ project: 1, status: 1 });
claimSchema.index({ project: 1, type: 1 });
claimSchema.index({ project: 1, confidence: -1 });
claimSchema.index({ project: 1, 'quality.overallScore': -1 });
claimSchema.index({ creator: 1, createdAt: -1 });
claimSchema.index({ tags: 1 });
claimSchema.index({ keywords: 1 });
claimSchema.index({ isActive: 1, status: 1 });
claimSchema.index({ 'source.type': 1, 'source.reference': 1 });

// Text search index
claimSchema.index({
  text: 'text',
  keywords: 'text',
  tags: 'text',
  'source.title': 'text',
  'source.author': 'text',
}, {
  weights: {
    text: 10,
    keywords: 5,
    tags: 3,
    'source.title': 2,
    'source.author': 1,
  },
  name: 'claim_text_search',
});

// Pre-save middleware to manage versions
claimSchema.pre('save', function(next) {
  if (this.isModified('text') && !this.isNew) {
    // Add new version if text changed
    const newVersion = {
      versionNumber: this.versions.length + 1,
      text: this.text,
      changedBy: this.creator, // This should be set by the controller
      timestamp: new Date(),
    };
    this.versions.push(newVersion);
  }
  next();
});

// Static methods
claimSchema.statics.findByProject = function(projectId: string, filters: Record<string, unknown> = {}) {
  return this.find({ project: projectId, isActive: true, ...filters })
    .populate('creator', 'firstName lastName email')
    .populate('evidence')
    .populate('reasoningChains')
    .sort({ updatedAt: -1 });
};

claimSchema.statics.searchText = function(query: string, projectId?: string) {
  const searchConditions: Record<string, unknown> = {
    $text: { $search: query },
    isActive: true,
  };

  if (projectId) {
    searchConditions.project = projectId;
  }

  return this.find(searchConditions, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .populate('creator', 'firstName lastName email')
    .populate('project', 'name');
};

claimSchema.statics.findSimilar = function(claimId: string, threshold: number = 0.5) {
  return this.find({
    'relatedClaims.claimId': claimId,
    'relatedClaims.relationship': 'similar',
    'relatedClaims.confidence': { $gte: threshold },
    isActive: true,
  });
};

// Virtual for word count
claimSchema.virtual('wordCount').get(function() {
  return this.text.split(/\s+/).length;
});

// Virtual for evidence count
claimSchema.virtual('evidenceCount').get(function() {
  return this.evidence.length;
});

// Virtual for relation count
claimSchema.virtual('relationCount').get(function() {
  return this.relatedClaims.length;
});

export default mongoose.model<IClaim>('Claim', claimSchema);