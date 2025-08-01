import mongoose, { Document, Schema } from 'mongoose';

export interface IEvidence extends Document {
  _id: mongoose.Types.ObjectId;
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
    isbn?: string;
    url?: string;
    page?: number;
    section?: string;
  };
  reliability: {
    score: number; // 0-1 scale
    factors: {
      sourceCredibility: number;
      methodologyQuality: number;
      replication: number;
      peerReview: boolean;
      sampleSize?: number;
      biasAssessment: number;
    };
    assessedBy?: mongoose.Types.ObjectId;
    assessedAt?: Date;
    notes?: string;
  };
  relevance: {
    score: number; // 0-1 scale
    contextual: boolean;
    temporal: boolean;
    geographical: boolean;
    demographic: boolean;
    notes?: string;
  };
  claims: mongoose.Types.ObjectId[]; // References to Claims this evidence supports
  project: mongoose.Types.ObjectId; // Reference to Project
  addedBy: mongoose.Types.ObjectId; // Reference to User
  keywords: string[];
  tags: string[];
  entities: Array<{
    text: string;
    type: string;
    confidence: number;
    position: {
      start: number;
      end: number;
    };
  }>;
  metadata: {
    extractionMethod?: string;
    confidence: number;
    processingDate: Date;
    fileInfo?: {
      filename: string;
      mimetype: string;
      size: number;
    };
  };
  annotations: Array<{
    user: mongoose.Types.ObjectId;
    type: 'highlight' | 'note' | 'question' | 'correction';
    text: string;
    position?: {
      start: number;
      end: number;
    };
    timestamp: Date;
    resolved?: boolean;
  }>;
  relationships: Array<{
    evidenceId: mongoose.Types.ObjectId;
    relationship: 'supports' | 'contradicts' | 'complements' | 'duplicates';
    confidence: number;
    notes?: string;
  }>;
  quality: {
    overallScore: number;
    completenessScore: number;
    accuracyScore: number;
    objectivityScore: number;
    timelinessScore: number;
    issues: string[];
    recommendations: string[];
  };
  verification: {
    status: 'unverified' | 'verified' | 'disputed' | 'retracted';
    verifiedBy?: mongoose.Types.ObjectId;
    verifiedAt?: Date;
    verificationNotes?: string;
    disputeReasons?: string[];
  };
  usage: {
    citationCount: number;
    lastCited?: Date;
    contexts: string[]; // Different contexts where this evidence was used
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const evidenceSchema = new Schema<IEvidence>({
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000,
    index: 'text',
  },
  type: {
    type: String,
    enum: ['empirical', 'statistical', 'testimonial', 'expert', 'documented', 'anecdotal'],
    required: true,
    index: true,
  },
  source: {
    type: {
      type: String,
      enum: ['document', 'url', 'database', 'survey', 'interview', 'observation'],
      required: true,
    },
    reference: { type: String, required: true },
    author: String,
    title: String,
    publication: String,
    publishedDate: Date,
    accessedDate: Date,
    doi: {
      type: String,
      validate: {
        validator: function(v: string) {
          return !v || /^10\.\d{4,}\//.test(v);
        },
        message: 'Invalid DOI format',
      },
    },
    isbn: {
      type: String,
      validate: {
        validator: function(v: string) {
          return !v || /^[\d-]{10,17}$/.test(v.replace(/[^\d-]/g, ''));
        },
        message: 'Invalid ISBN format',
      },
    },
    url: {
      type: String,
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Invalid URL format',
      },
    },
    page: Number,
    section: String,
  },
  reliability: {
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      index: true,
    },
    factors: {
      sourceCredibility: { type: Number, min: 0, max: 1, required: true },
      methodologyQuality: { type: Number, min: 0, max: 1, required: true },
      replication: { type: Number, min: 0, max: 1, required: true },
      peerReview: { type: Boolean, default: false },
      sampleSize: Number,
      biasAssessment: { type: Number, min: 0, max: 1, required: true },
    },
    assessedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    assessedAt: Date,
    notes: String,
  },
  relevance: {
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      index: true,
    },
    contextual: { type: Boolean, default: true },
    temporal: { type: Boolean, default: true },
    geographical: { type: Boolean, default: true },
    demographic: { type: Boolean, default: true },
    notes: String,
  },
  claims: [{
    type: Schema.Types.ObjectId,
    ref: 'Claim',
  }],
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true,
  },
  addedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  keywords: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 30,
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
  metadata: {
    extractionMethod: String,
    confidence: { type: Number, min: 0, max: 1, required: true },
    processingDate: { type: Date, default: Date.now },
    fileInfo: {
      filename: String,
      mimetype: String,
      size: Number,
    },
  },
  annotations: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['highlight', 'note', 'question', 'correction'],
      required: true,
    },
    text: { type: String, required: true, maxlength: 500 },
    position: {
      start: Number,
      end: Number,
    },
    timestamp: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false },
  }],
  relationships: [{
    evidenceId: {
      type: Schema.Types.ObjectId,
      ref: 'Evidence',
      required: true,
    },
    relationship: {
      type: String,
      enum: ['supports', 'contradicts', 'complements', 'duplicates'],
      required: true,
    },
    confidence: { type: Number, min: 0, max: 1, required: true },
    notes: String,
  }],
  quality: {
    overallScore: { type: Number, min: 0, max: 1, default: 0 },
    completenessScore: { type: Number, min: 0, max: 1, default: 0 },
    accuracyScore: { type: Number, min: 0, max: 1, default: 0 },
    objectivityScore: { type: Number, min: 0, max: 1, default: 0 },
    timelinessScore: { type: Number, min: 0, max: 1, default: 0 },
    issues: [String],
    recommendations: [String],
  },
  verification: {
    status: {
      type: String,
      enum: ['unverified', 'verified', 'disputed', 'retracted'],
      default: 'unverified',
      index: true,
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: Date,
    verificationNotes: String,
    disputeReasons: [String],
  },
  usage: {
    citationCount: { type: Number, default: 0 },
    lastCited: Date,
    contexts: [String],
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
evidenceSchema.index({ project: 1, type: 1 });
evidenceSchema.index({ project: 1, 'reliability.score': -1 });
evidenceSchema.index({ project: 1, 'relevance.score': -1 });
evidenceSchema.index({ addedBy: 1, createdAt: -1 });
evidenceSchema.index({ 'verification.status': 1, 'reliability.score': -1 });
evidenceSchema.index({ tags: 1 });
evidenceSchema.index({ keywords: 1 });
evidenceSchema.index({ 'source.type': 1, 'source.publishedDate': -1 });

// Text search index
evidenceSchema.index({
  text: 'text',
  keywords: 'text',
  tags: 'text',
  'source.title': 'text',
  'source.author': 'text',
  'source.publication': 'text',
}, {
  weights: {
    text: 10,
    keywords: 5,
    tags: 3,
    'source.title': 2,
    'source.author': 1,
    'source.publication': 1,
  },
  name: 'evidence_text_search',
});

// Virtual for citation format
evidenceSchema.virtual('citation').get(function() {
  const source = this.source;
  let citation = '';
  
  if (source.author) citation += `${source.author}. `;
  if (source.title) citation += `"${source.title}". `;
  if (source.publication) citation += `${source.publication}. `;
  if (source.publishedDate) citation += `${source.publishedDate.getFullYear()}. `;
  if (source.doi) citation += `DOI: ${source.doi}`;
  
  return citation.trim();
});

// Virtual for word count
evidenceSchema.virtual('wordCount').get(function() {
  return this.text.split(/\s+/).length;
});

// Virtual for strength score (combination of reliability and relevance)
evidenceSchema.virtual('strengthScore').get(function() {
  return (this.reliability.score * 0.6) + (this.relevance.score * 0.4);
});

// Pre-save middleware to update quality scores
evidenceSchema.pre('save', function(next) {
  // Calculate overall quality score
  const scores = [
    this.quality.completenessScore,
    this.quality.accuracyScore,
    this.quality.objectivityScore,
    this.quality.timelinessScore,
  ];
  
  this.quality.overallScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  
  // Update usage statistics
  if (this.isModified('claims') && this.claims.length > 0) {
    this.usage.lastCited = new Date();
    this.usage.citationCount = this.claims.length;
  }
  
  next();
});

// Static methods
evidenceSchema.statics.findByProject = function(projectId: string, filters: any = {}) {
  return this.find({ project: projectId, isActive: true, ...filters })
    .populate('addedBy', 'firstName lastName email')
    .populate('claims', 'text type')
    .sort({ 'reliability.score': -1, updatedAt: -1 });
};

evidenceSchema.statics.findHighQuality = function(projectId: string, minScore: number = 0.7) {
  return this.find({
    project: projectId,
    isActive: true,
    'reliability.score': { $gte: minScore },
    'verification.status': { $in: ['verified', 'unverified'] },
  })
    .populate('addedBy', 'firstName lastName email')
    .sort({ 'reliability.score': -1 });
};

evidenceSchema.statics.searchEvidence = function(query: string, projectId?: string) {
  const searchConditions: any = {
    $text: { $search: query },
    isActive: true,
  };
  
  if (projectId) {
    searchConditions.project = projectId;
  }
  
  return this.find(searchConditions, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .populate('addedBy', 'firstName lastName email')
    .populate('project', 'name');
};

evidenceSchema.statics.findBySource = function(sourceReference: string, sourceType?: string) {
  const query: any = { 'source.reference': sourceReference, isActive: true };
  if (sourceType) {
    query['source.type'] = sourceType;
  }
  
  return this.find(query)
    .populate('project', 'name')
    .populate('addedBy', 'firstName lastName email');
};

// Instance methods
evidenceSchema.methods.addAnnotation = function(userId: string, type: string, text: string, position?: any) {
  this.annotations.push({
    user: userId,
    type,
    text,
    position,
    timestamp: new Date(),
  });
  return this.save();
};

evidenceSchema.methods.verify = function(userId: string, notes?: string) {
  this.verification.status = 'verified';
  this.verification.verifiedBy = userId;
  this.verification.verifiedAt = new Date();
  if (notes) this.verification.verificationNotes = notes;
  return this.save();
};

evidenceSchema.methods.dispute = function(reasons: string[]) {
  this.verification.status = 'disputed';
  this.verification.disputeReasons = reasons;
  return this.save();
};

export default mongoose.model<IEvidence>('Evidence', evidenceSchema);