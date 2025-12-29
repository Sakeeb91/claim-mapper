import mongoose, { Document, Schema } from 'mongoose';

export interface IReasoningChain extends Document {
  _id: mongoose.Types.ObjectId;
  claim: mongoose.Types.ObjectId; // Reference to the main claim
  type: 'deductive' | 'inductive' | 'abductive' | 'analogical' | 'causal' | 'statistical';
  steps: Array<{
    stepNumber: number;
    text: string;
    type: 'premise' | 'inference' | 'conclusion' | 'assumption' | 'observation';
    confidence: number;
    evidence: mongoose.Types.ObjectId[]; // References to Evidence
    logicalOperator?: 'and' | 'or' | 'if-then' | 'if-and-only-if' | 'not';
    validation: {
      isValid: boolean;
      issues: string[];
      suggestions: string[];
    };
    metadata: {
      generatedBy: 'ai' | 'human' | 'hybrid';
      sourceModel?: string;
      timestamp: Date;
      linkedEvidence?: Array<{
        evidenceId: string;
        evidenceText: string;
        relationship: 'supports' | 'refutes' | 'partial_support' | 'partial_refute' | 'neutral';
        confidence: number;
        vectorScore?: number;
        rerankScore?: number;
        sourceUrl?: string;
      }>;
    };
  }>;
  structure: {
    premises: number[]; // Step numbers that are premises
    inferences: number[]; // Step numbers that are inferences
    conclusions: number[]; // Step numbers that are conclusions
    dependencies: Array<{
      from: number;
      to: number;
      relationship: 'supports' | 'requires' | 'contradicts';
    }>;
  };
  validity: {
    logicalValidity: number; // 0-1 scale
    soundness: number; // 0-1 scale
    completeness: number; // 0-1 scale
    coherence: number; // 0-1 scale
    overallScore: number;
    assessedBy?: mongoose.Types.ObjectId;
    assessedAt?: Date;
    validationNotes?: string;
  };
  quality: {
    clarity: number;
    precision: number;
    relevance: number;
    strength: number;
    originality: number;
    overallQuality: number;
    issues: string[];
    recommendations: string[];
  };
  analysis: {
    fallacies: Array<{
      type: string;
      description: string;
      stepNumbers: number[];
      severity: 'low' | 'medium' | 'high';
      suggestion: string;
    }>;
    gaps: Array<{
      type: 'missing_premise' | 'weak_connection' | 'unsupported_assumption' | 'circular_reasoning';
      description: string;
      location: number; // Step number where gap occurs
      severity: number; // 0-1 scale
      suggestion: string;
    }>;
    strengths: Array<{
      type: string;
      description: string;
      stepNumbers: number[];
    }>;
    counterarguments: Array<{
      text: string;
      strength: number;
      source?: string;
      refutation?: string;
    }>;
  };
  alternatives: Array<{
    chainId?: mongoose.Types.ObjectId;
    description: string;
    type: string;
    strength: number;
    generatedBy: 'ai' | 'human';
    notes?: string;
  }>;
  project: mongoose.Types.ObjectId; // Reference to Project
  creator: mongoose.Types.ObjectId; // Reference to User
  collaborators: Array<{
    user: mongoose.Types.ObjectId;
    role: 'reviewer' | 'editor' | 'validator';
    contributions: string[];
    addedAt: Date;
  }>;
  reviews: Array<{
    reviewer: mongoose.Types.ObjectId;
    rating: number; // 1-5 scale
    comments: string;
    focusAreas: string[]; // e.g., 'logic', 'evidence', 'clarity'
    approved: boolean;
    reviewedAt: Date;
    reviewType: 'peer' | 'expert' | 'automated';
  }>;
  versions: Array<{
    versionNumber: number;
    changes: string[];
    changedBy: mongoose.Types.ObjectId;
    changeReason: string;
    timestamp: Date;
    previousSteps: any[]; // Backup of previous version
  }>;
  usage: {
    citedBy: mongoose.Types.ObjectId[]; // Other reasoning chains that reference this
    reusedCount: number;
    adaptedCount: number;
    contexts: string[];
  };
  metadata: {
    generationMethod: 'manual' | 'ai_assisted' | 'fully_automated';
    aiModel?: string;
    processingTime?: number;
    complexity: 'simple' | 'intermediate' | 'complex' | 'advanced';
    domain?: string;
    language: string;
    wordCount: number;
  };
  tags: string[];
  status: 'draft' | 'review' | 'validated' | 'published' | 'archived';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reasoningChainSchema = new Schema<IReasoningChain>({
  claim: {
    type: Schema.Types.ObjectId,
    ref: 'Claim',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['deductive', 'inductive', 'abductive', 'analogical', 'causal', 'statistical'],
    required: true,
    index: true,
  },
  steps: [{
    stepNumber: { type: Number, required: true },
    text: { type: String, required: true, maxlength: 1000 },
    type: {
      type: String,
      enum: ['premise', 'inference', 'conclusion', 'assumption', 'observation'],
      required: true,
    },
    confidence: { type: Number, min: 0, max: 1, required: true },
    evidence: [{
      type: Schema.Types.ObjectId,
      ref: 'Evidence',
    }],
    logicalOperator: {
      type: String,
      enum: ['and', 'or', 'if-then', 'if-and-only-if', 'not'],
    },
    validation: {
      isValid: { type: Boolean, default: true },
      issues: [String],
      suggestions: [String],
    },
    metadata: {
      generatedBy: {
        type: String,
        enum: ['ai', 'human', 'hybrid'],
        required: true,
      },
      sourceModel: String,
      timestamp: { type: Date, default: Date.now },
      linkedEvidence: [{
        evidenceId: String,
        evidenceText: String,
        relationship: {
          type: String,
          enum: ['supports', 'refutes', 'partial_support', 'partial_refute', 'neutral'],
        },
        confidence: Number,
        vectorScore: Number,
        rerankScore: Number,
        sourceUrl: String,
      }],
    },
  }],
  structure: {
    premises: [Number],
    inferences: [Number],
    conclusions: [Number],
    dependencies: [{
      from: { type: Number, required: true },
      to: { type: Number, required: true },
      relationship: {
        type: String,
        enum: ['supports', 'requires', 'contradicts'],
        required: true,
      },
    }],
  },
  validity: {
    logicalValidity: { type: Number, min: 0, max: 1, default: 0 },
    soundness: { type: Number, min: 0, max: 1, default: 0 },
    completeness: { type: Number, min: 0, max: 1, default: 0 },
    coherence: { type: Number, min: 0, max: 1, default: 0 },
    overallScore: { type: Number, min: 0, max: 1, default: 0 },
    assessedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    assessedAt: Date,
    validationNotes: String,
  },
  quality: {
    clarity: { type: Number, min: 0, max: 1, default: 0 },
    precision: { type: Number, min: 0, max: 1, default: 0 },
    relevance: { type: Number, min: 0, max: 1, default: 0 },
    strength: { type: Number, min: 0, max: 1, default: 0 },
    originality: { type: Number, min: 0, max: 1, default: 0 },
    overallQuality: { type: Number, min: 0, max: 1, default: 0 },
    issues: [String],
    recommendations: [String],
  },
  analysis: {
    fallacies: [{
      type: { type: String, required: true },
      description: { type: String, required: true },
      stepNumbers: [Number],
      severity: {
        type: String,
        enum: ['low', 'medium', 'high'],
        required: true,
      },
      suggestion: { type: String, required: true },
    }],
    gaps: [{
      type: {
        type: String,
        enum: ['missing_premise', 'weak_connection', 'unsupported_assumption', 'circular_reasoning'],
        required: true,
      },
      description: { type: String, required: true },
      location: { type: Number, required: true },
      severity: { type: Number, min: 0, max: 1, required: true },
      suggestion: { type: String, required: true },
    }],
    strengths: [{
      type: { type: String, required: true },
      description: { type: String, required: true },
      stepNumbers: [Number],
    }],
    counterarguments: [{
      text: { type: String, required: true },
      strength: { type: Number, min: 0, max: 1, required: true },
      source: String,
      refutation: String,
    }],
  },
  alternatives: [{
    chainId: {
      type: Schema.Types.ObjectId,
      ref: 'ReasoningChain',
    },
    description: { type: String, required: true },
    type: { type: String, required: true },
    strength: { type: Number, min: 0, max: 1, required: true },
    generatedBy: {
      type: String,
      enum: ['ai', 'human'],
      required: true,
    },
    notes: String,
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
      enum: ['reviewer', 'editor', 'validator'],
      required: true,
    },
    contributions: [String],
    addedAt: { type: Date, default: Date.now },
  }],
  reviews: [{
    reviewer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: { type: Number, min: 1, max: 5, required: true },
    comments: { type: String, required: true },
    focusAreas: [String],
    approved: { type: Boolean, required: true },
    reviewedAt: { type: Date, default: Date.now },
    reviewType: {
      type: String,
      enum: ['peer', 'expert', 'automated'],
      required: true,
    },
  }],
  versions: [{
    versionNumber: { type: Number, required: true },
    changes: [String],
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    changeReason: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    previousSteps: [Schema.Types.Mixed],
  }],
  usage: {
    citedBy: [{
      type: Schema.Types.ObjectId,
      ref: 'ReasoningChain',
    }],
    reusedCount: { type: Number, default: 0 },
    adaptedCount: { type: Number, default: 0 },
    contexts: [String],
  },
  metadata: {
    generationMethod: {
      type: String,
      enum: ['manual', 'ai_assisted', 'fully_automated'],
      required: true,
    },
    aiModel: String,
    processingTime: Number,
    complexity: {
      type: String,
      enum: ['simple', 'intermediate', 'complex', 'advanced'],
      default: 'intermediate',
    },
    domain: String,
    language: { type: String, default: 'en' },
    wordCount: { type: Number, default: 0 },
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 30,
  }],
  status: {
    type: String,
    enum: ['draft', 'review', 'validated', 'published', 'archived'],
    default: 'draft',
    index: true,
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

// Compound indexes for performance
reasoningChainSchema.index({ project: 1, creator: 1 });
reasoningChainSchema.index({ project: 1, status: 1 });
reasoningChainSchema.index({ project: 1, type: 1 });
reasoningChainSchema.index({ claim: 1, type: 1 });
reasoningChainSchema.index({ 'validity.overallScore': -1, status: 1 });
reasoningChainSchema.index({ 'quality.overallQuality': -1, status: 1 });
reasoningChainSchema.index({ creator: 1, createdAt: -1 });
reasoningChainSchema.index({ tags: 1 });
reasoningChainSchema.index({ 'metadata.complexity': 1, type: 1 });

// Text search index
reasoningChainSchema.index({
  'steps.text': 'text',
  tags: 'text',
  'analysis.fallacies.description': 'text',
  'analysis.strengths.description': 'text',
}, {
  weights: {
    'steps.text': 10,
    tags: 5,
    'analysis.fallacies.description': 3,
    'analysis.strengths.description': 3,
  },
  name: 'reasoning_chain_text_search',
});

// Virtual for step count
reasoningChainSchema.virtual('stepCount').get(function() {
  return this.steps.length;
});

// Virtual for average confidence
reasoningChainSchema.virtual('averageConfidence').get(function() {
  if (this.steps.length === 0) return 0;
  const totalConfidence = this.steps.reduce((sum, step) => sum + step.confidence, 0);
  return totalConfidence / this.steps.length;
});

// Virtual for fallacy count
reasoningChainSchema.virtual('fallacyCount').get(function() {
  return this.analysis.fallacies.length;
});

// Virtual for gap count
reasoningChainSchema.virtual('gapCount').get(function() {
  return this.analysis.gaps.length;
});

// Virtual for evidence count
reasoningChainSchema.virtual('evidenceCount').get(function() {
  const evidenceIds = new Set();
  this.steps.forEach(step => {
    step.evidence.forEach(evidenceId => {
      evidenceIds.add(evidenceId.toString());
    });
  });
  return evidenceIds.size;
});

// Pre-save middleware to calculate scores and metadata
reasoningChainSchema.pre('save', function(next) {
  // Calculate word count
  this.metadata.wordCount = this.steps.reduce((total, step) => {
    return total + step.text.split(/\s+/).length;
  }, 0);
  
  // Calculate overall validity score
  const validityScores = [
    this.validity.logicalValidity,
    this.validity.soundness,
    this.validity.completeness,
    this.validity.coherence,
  ];
  this.validity.overallScore = validityScores.reduce((sum, score) => sum + score, 0) / validityScores.length;
  
  // Calculate overall quality score
  const qualityScores = [
    this.quality.clarity,
    this.quality.precision,
    this.quality.relevance,
    this.quality.strength,
    this.quality.originality,
  ];
  this.quality.overallQuality = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
  
  // Update structure arrays
  this.structure.premises = this.steps.filter(step => step.type === 'premise').map(step => step.stepNumber);
  this.structure.inferences = this.steps.filter(step => step.type === 'inference').map(step => step.stepNumber);
  this.structure.conclusions = this.steps.filter(step => step.type === 'conclusion').map(step => step.stepNumber);
  
  // Add version if steps were modified
  if (this.isModified('steps') && !this.isNew) {
    const newVersion = {
      versionNumber: this.versions.length + 1,
      changes: ['Steps modified'],
      changedBy: this.creator,
      changeReason: 'Steps updated',
      timestamp: new Date(),
      previousSteps: this.steps,
    };
    this.versions.push(newVersion);
  }
  
  next();
});

// Static methods
reasoningChainSchema.statics.findByProject = function(projectId: string, filters: any = {}) {
  return this.find({ project: projectId, isActive: true, ...filters })
    .populate('claim', 'text type')
    .populate('creator', 'firstName lastName email')
    .populate('steps.evidence', 'text type reliability.score')
    .sort({ 'validity.overallScore': -1, updatedAt: -1 });
};

reasoningChainSchema.statics.findByClaim = function(claimId: string) {
  return this.find({ claim: claimId, isActive: true })
    .populate('creator', 'firstName lastName email')
    .populate('steps.evidence', 'text type reliability.score')
    .sort({ 'validity.overallScore': -1 });
};

reasoningChainSchema.statics.findHighQuality = function(projectId: string, minScore: number = 0.7) {
  return this.find({
    project: projectId,
    isActive: true,
    'validity.overallScore': { $gte: minScore },
    status: { $in: ['validated', 'published'] },
  })
    .populate('claim', 'text type')
    .populate('creator', 'firstName lastName email')
    .sort({ 'validity.overallScore': -1 });
};

reasoningChainSchema.statics.searchReasoningChains = function(query: string, projectId?: string) {
  const searchConditions: any = {
    $text: { $search: query },
    isActive: true,
  };
  
  if (projectId) {
    searchConditions.project = projectId;
  }
  
  return this.find(searchConditions, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .populate('claim', 'text type')
    .populate('creator', 'firstName lastName email')
    .populate('project', 'name');
};

// Instance methods
reasoningChainSchema.methods.addStep = function(stepData: any, position?: number) {
  const newStep = {
    stepNumber: position || this.steps.length + 1,
    ...stepData,
    metadata: {
      generatedBy: stepData.metadata?.generatedBy || 'human',
      timestamp: new Date(),
      ...stepData.metadata,
    },
  };
  
  if (position && position <= this.steps.length) {
    // Insert at specific position and renumber subsequent steps
    this.steps.splice(position - 1, 0, newStep);
    this.steps.forEach((step, index) => {
      step.stepNumber = index + 1;
    });
  } else {
    this.steps.push(newStep);
  }
  
  return this.save();
};

reasoningChainSchema.methods.removeStep = function(stepNumber: number) {
  this.steps = this.steps.filter(step => step.stepNumber !== stepNumber);
  // Renumber remaining steps
  this.steps.forEach((step, index) => {
    step.stepNumber = index + 1;
  });
  return this.save();
};

reasoningChainSchema.methods.addReview = function(reviewerId: string, rating: number, comments: string, focusAreas: string[] = []) {
  this.reviews.push({
    reviewer: reviewerId,
    rating,
    comments,
    focusAreas,
    approved: rating >= 3,
    reviewedAt: new Date(),
    reviewType: 'peer',
  });
  return this.save();
};

reasoningChainSchema.methods.validate = function(validatorId: string, notes?: string) {
  this.validity.assessedBy = validatorId;
  this.validity.assessedAt = new Date();
  if (notes) this.validity.validationNotes = notes;
  this.status = 'validated';
  return this.save();
};

export default mongoose.model<IReasoningChain>('ReasoningChain', reasoningChainSchema);