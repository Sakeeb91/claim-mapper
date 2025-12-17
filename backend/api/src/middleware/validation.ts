import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../utils/logger';

// Custom validation schemas
export const validationSchemas = {
  // User validation
  register: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required',
    }),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required().messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'string.empty': 'Password is required',
    }),
    firstName: Joi.string().min(2).max(50).required().messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name cannot exceed 50 characters',
      'string.empty': 'First name is required',
    }),
    lastName: Joi.string().min(2).max(50).required().messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name cannot exceed 50 characters',
      'string.empty': 'Last name is required',
    }),
    role: Joi.string().valid('user', 'researcher').default('user'),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    rememberMe: Joi.boolean().default(false),
  }),

  updateProfile: Joi.object({
    firstName: Joi.string().min(2).max(50),
    lastName: Joi.string().min(2).max(50),
    avatar: Joi.string().uri(),
    preferences: Joi.object({
      theme: Joi.string().valid('light', 'dark'),
      notifications: Joi.object({
        email: Joi.boolean(),
        push: Joi.boolean(),
        collaboration: Joi.boolean(),
      }),
      privacy: Joi.object({
        profileVisible: Joi.boolean(),
        showActivity: Joi.boolean(),
      }),
    }),
    profile: Joi.object({
      bio: Joi.string().max(500),
      organization: Joi.string().max(100),
      department: Joi.string().max(100),
      researchInterests: Joi.array().items(Joi.string().max(50)).max(10),
      socialLinks: Joi.object({
        website: Joi.string().uri(),
        twitter: Joi.string(),
        linkedin: Joi.string(),
        orcid: Joi.string(),
      }),
    }),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
      'any.only': 'Passwords do not match',
    }),
  }),

  // Project validation
  createProject: Joi.object({
    name: Joi.string().min(3).max(100).required().messages({
      'string.min': 'Project name must be at least 3 characters long',
      'string.max': 'Project name cannot exceed 100 characters',
      'string.empty': 'Project name is required',
    }),
    description: Joi.string().max(1000),
    type: Joi.string().valid('research', 'education', 'business', 'personal').required(),
    visibility: Joi.string().valid('private', 'team', 'public').default('private'),
    tags: Joi.array().items(Joi.string().max(30)).max(20),
    categories: Joi.array().items(Joi.string().max(50)).max(10),
    settings: Joi.object({
      claimValidation: Joi.object({
        requireApproval: Joi.boolean(),
        minimumConfidence: Joi.number().min(0).max(1),
        allowAutoExtraction: Joi.boolean(),
      }),
      reasoning: Joi.object({
        enableAIGeneration: Joi.boolean(),
        requireEvidence: Joi.boolean(),
        allowPublicReview: Joi.boolean(),
      }),
      collaboration: Joi.object({
        allowComments: Joi.boolean(),
        allowVersioning: Joi.boolean(),
        notifyOnChanges: Joi.boolean(),
      }),
    }),
  }),

  updateProject: Joi.object({
    name: Joi.string().min(3).max(100),
    description: Joi.string().max(1000),
    status: Joi.string().valid('active', 'completed', 'archived', 'paused'),
    visibility: Joi.string().valid('private', 'team', 'public'),
    tags: Joi.array().items(Joi.string().max(30)).max(20),
    categories: Joi.array().items(Joi.string().max(50)).max(10),
    settings: Joi.object({
      claimValidation: Joi.object({
        requireApproval: Joi.boolean(),
        minimumConfidence: Joi.number().min(0).max(1),
        allowAutoExtraction: Joi.boolean(),
      }),
      reasoning: Joi.object({
        enableAIGeneration: Joi.boolean(),
        requireEvidence: Joi.boolean(),
        allowPublicReview: Joi.boolean(),
      }),
      collaboration: Joi.object({
        allowComments: Joi.boolean(),
        allowVersioning: Joi.boolean(),
        notifyOnChanges: Joi.boolean(),
      }),
    }),
  }),

  inviteCollaborator: Joi.object({
    email: Joi.string().email().required(),
    role: Joi.string().valid('viewer', 'editor', 'admin').required(),
    message: Joi.string().max(500),
  }),

  // Claim validation
  createClaim: Joi.object({
    text: Joi.string().min(10).max(2000).required().messages({
      'string.min': 'Claim text must be at least 10 characters long',
      'string.max': 'Claim text cannot exceed 2000 characters',
      'string.empty': 'Claim text is required',
    }),
    type: Joi.string().valid('assertion', 'question', 'hypothesis', 'conclusion', 'assumption').required(),
    source: Joi.object({
      type: Joi.string().valid('document', 'url', 'manual', 'extracted').required(),
      reference: Joi.string(),
      page: Joi.number().integer().min(1),
      section: Joi.string(),
      author: Joi.string(),
      title: Joi.string(),
      publishedDate: Joi.date(),
    }),
    confidence: Joi.number().min(0).max(1).required(),
    position: Joi.object({
      start: Joi.number().integer().min(0).required(),
      end: Joi.number().integer().min(Joi.ref('start')).required(),
      paragraph: Joi.number().integer().min(1),
    }),
    keywords: Joi.array().items(Joi.string().max(50)).max(20),
    tags: Joi.array().items(Joi.string().max(30)).max(10),
    evidence: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)), // MongoDB ObjectId
  }),

  updateClaim: Joi.object({
    text: Joi.string().min(10).max(2000),
    type: Joi.string().valid('assertion', 'question', 'hypothesis', 'conclusion', 'assumption'),
    confidence: Joi.number().min(0).max(1),
    keywords: Joi.array().items(Joi.string().max(50)).max(20),
    tags: Joi.array().items(Joi.string().max(30)).max(10),
    status: Joi.string().valid('draft', 'review', 'approved', 'rejected', 'archived'),
  }),

  relateClaimsRequest: Joi.object({
    claimIds: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).min(2).max(10).required(),
    relationship: Joi.string().valid('supports', 'contradicts', 'questions', 'elaborates', 'similar').required(),
    confidence: Joi.number().min(0).max(1).required(),
    notes: Joi.string().max(500),
  }),

  // Evidence validation
  createEvidence: Joi.object({
    text: Joi.string().min(10).max(5000).required(),
    type: Joi.string().valid('empirical', 'statistical', 'testimonial', 'expert', 'documented', 'anecdotal').required(),
    source: Joi.object({
      type: Joi.string().valid('document', 'url', 'database', 'survey', 'interview', 'observation').required(),
      reference: Joi.string().required(),
      author: Joi.string(),
      title: Joi.string(),
      publication: Joi.string(),
      publishedDate: Joi.date(),
      accessedDate: Joi.date(),
      doi: Joi.string().pattern(/^10\.\d{4,}\//),
      isbn: Joi.string(),
      url: Joi.string().uri(),
      page: Joi.number().integer().min(1),
      section: Joi.string(),
    }).required(),
    reliability: Joi.object({
      score: Joi.number().min(0).max(1).required(),
      factors: Joi.object({
        sourceCredibility: Joi.number().min(0).max(1).required(),
        methodologyQuality: Joi.number().min(0).max(1).required(),
        replication: Joi.number().min(0).max(1).required(),
        peerReview: Joi.boolean().required(),
        sampleSize: Joi.number().integer().min(0),
        biasAssessment: Joi.number().min(0).max(1).required(),
      }).required(),
      notes: Joi.string().max(500),
    }).required(),
    relevance: Joi.object({
      score: Joi.number().min(0).max(1).required(),
      contextual: Joi.boolean(),
      temporal: Joi.boolean(),
      geographical: Joi.boolean(),
      demographic: Joi.boolean(),
      notes: Joi.string().max(500),
    }).required(),
    keywords: Joi.array().items(Joi.string().max(50)).max(20),
    tags: Joi.array().items(Joi.string().max(30)).max(10),
  }),

  // Reasoning Chain validation
  createReasoningChain: Joi.object({
    claim: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    type: Joi.string().valid('deductive', 'inductive', 'abductive', 'analogical', 'causal', 'statistical').required(),
    steps: Joi.array().items(
      Joi.object({
        stepNumber: Joi.number().integer().min(1).required(),
        text: Joi.string().min(10).max(1000).required(),
        type: Joi.string().valid('premise', 'inference', 'conclusion', 'assumption', 'observation').required(),
        confidence: Joi.number().min(0).max(1).required(),
        evidence: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)),
        logicalOperator: Joi.string().valid('and', 'or', 'if-then', 'if-and-only-if', 'not'),
      })
    ).min(2).max(20).required(),
    tags: Joi.array().items(Joi.string().max(30)).max(10),
  }),

  // Search and filter validation
  searchQuery: Joi.object({
    q: Joi.string().min(1).max(500),
    type: Joi.string().valid('claims', 'evidence', 'reasoning', 'projects', 'all'),
    filters: Joi.object({
      projectId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
      dateFrom: Joi.date(),
      dateTo: Joi.date(),
      confidence: Joi.object({
        min: Joi.number().min(0).max(1),
        max: Joi.number().min(0).max(1),
      }),
      tags: Joi.array().items(Joi.string()),
      status: Joi.array().items(Joi.string()),
    }),
    sort: Joi.object({
      field: Joi.string().valid('relevance', 'date', 'confidence', 'quality'),
      order: Joi.string().valid('asc', 'desc'),
    }),
    pagination: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
    }),
  }),

  // Graph validation
  graphQuery: Joi.object({
    projectId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
    claimIds: Joi.alternatives().try(
      Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
      Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).max(50)
    ),
    maxDepth: Joi.number().integer().min(1).max(5).default(2),
    includeEvidence: Joi.boolean().default(true),
    includeReasoning: Joi.boolean().default(false),
    minConfidence: Joi.number().min(0).max(1),
    types: Joi.alternatives().try(
      Joi.string().valid('claim', 'evidence', 'reasoning'),
      Joi.array().items(Joi.string().valid('claim', 'evidence', 'reasoning'))
    ),
    limit: Joi.number().integer().min(1).max(1000).default(500),
  }),

  // Collaboration validation
  createSession: Joi.object({
    project: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    type: Joi.string().valid('collaborative', 'individual', 'review', 'analysis').required(),
    settings: Joi.object({
      visibility: Joi.string().valid('private', 'team', 'public'),
      recording: Joi.object({
        enabled: Joi.boolean(),
        recordChanges: Joi.boolean(),
        recordChat: Joi.boolean(),
        recordVoice: Joi.boolean(),
      }),
      collaboration: Joi.object({
        maxParticipants: Joi.number().integer().min(1).max(50),
        requireApproval: Joi.boolean(),
        allowAnonymous: Joi.boolean(),
        enableVoting: Joi.boolean(),
      }),
    }),
    metadata: Joi.object({
      title: Joi.string().max(100),
      description: Joi.string().max(500),
      agenda: Joi.array().items(Joi.string()),
      objectives: Joi.array().items(Joi.string()),
      scheduledStart: Joi.date(),
      scheduledEnd: Joi.date(),
      tags: Joi.array().items(Joi.string().max(30)),
    }),
  }),

  // File upload validation
  fileUpload: Joi.object({
    filename: Joi.string().required(),
    mimetype: Joi.string().valid(
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/html',
      'application/rtf'
    ).required(),
    size: Joi.number().max(50 * 1024 * 1024), // 50MB max
  }),

  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string(),
    order: Joi.string().valid('asc', 'desc').default('desc'),
  }),

  // MongoDB ObjectId
  objectId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).messages({
    'string.pattern.base': 'Invalid ID format',
  }),
};

// Validation middleware factory
export const validate = (schema: Joi.ObjectSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = req[source];
    
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      logger.warn('Validation error:', { errors, data });

      res.status(400).json({
        success: false,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors,
      });
      return;
    }

    // Replace original data with validated/sanitized data
    req[source] = value;
    next();
  };
};

// File validation middleware
export const validateFile = (options: {
  required?: boolean;
  maxSize?: number;
  allowedTypes?: string[];
  fieldName?: string;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { required = false, maxSize = 50 * 1024 * 1024, allowedTypes = [], fieldName = 'file' } = options;
    
    const file = req.file || req.files?.[fieldName];
    
    if (required && !file) {
      res.status(400).json({
        success: false,
        message: 'File is required',
        code: 'FILE_REQUIRED',
      });
      return;
    }
    
    if (!file) {
      next();
      return;
    }
    
    // Check file size
    if (file.size > maxSize) {
      res.status(400).json({
        success: false,
        message: `File size cannot exceed ${Math.round(maxSize / 1024 / 1024)}MB`,
        code: 'FILE_TOO_LARGE',
      });
      return;
    }
    
    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      res.status(400).json({
        success: false,
        message: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`,
        code: 'FILE_TYPE_NOT_ALLOWED',
      });
      return;
    }
    
    next();
  };
};

// Sanitization helpers
export const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    // Remove potential XSS vectors
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const key in input) {
      sanitized[key] = sanitizeInput(input[key]);
    }
    return sanitized;
  }
  
  return input;
};

// Sanitization middleware
export const sanitize = (req: Request, res: Response, next: NextFunction): void => {
  req.body = sanitizeInput(req.body);
  req.query = sanitizeInput(req.query);
  req.params = sanitizeInput(req.params);
  next();
};

// Custom validation helpers
export const isValidObjectId = (id: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isStrongPassword = (password: string): boolean => {
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return strongPasswordRegex.test(password);
};

// Rate limiting validation
export const validateRateLimit = (windowMs: number, maxRequests: number) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = `rate_limit:${req.ip}:${req.path}`;
      const currentCount = await redisManager.incrementCounter(key, windowMs / 1000);
      
      if (currentCount > maxRequests) {
        res.status(429).json({
          success: false,
          message: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: windowMs / 1000,
        });
        return;
      }
      
      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': Math.max(0, maxRequests - currentCount).toString(),
        'X-RateLimit-Reset': new Date(Date.now() + windowMs).toISOString(),
      });
      
      next();
    } catch (error) {
      logger.error('Rate limit validation error:', error);
      next(); // Don't block on Redis errors
    }
  };
};

// Export commonly used validation middleware
export const validateObjectId = validate(validationSchemas.objectId, 'params');
export const validatePagination = validate(validationSchemas.pagination, 'query');
export const validateSearch = validate(validationSchemas.searchQuery, 'query');

export default {
  validate,
  validateFile,
  sanitize,
  sanitizeInput,
  isValidObjectId,
  isValidEmail,
  isStrongPassword,
  validateRateLimit,
  schemas: validationSchemas,
};