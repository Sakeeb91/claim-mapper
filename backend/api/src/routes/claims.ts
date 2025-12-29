import express from 'express';
import { Request, Response } from 'express';
import axios from 'axios';
import Claim from '../models/Claim';
import Evidence from '../models/Evidence';
import Project from '../models/Project';
import { authenticate, requireProjectAccess } from '../middleware/auth';
import { validate, validationSchemas, sanitize, validatePagination } from '../middleware/validation';
import { asyncHandler, createError } from '../middleware/errorHandler';
import redisManager from '../config/redis';
import { logger } from '../utils/logger';

const router = express.Router();

// GET /api/claims - Get all claims with filtering and pagination
router.get('/',
  authenticate,
  validatePagination,
  asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, sort = 'updatedAt', order = 'desc' } = req.query;
    const { projectId, type, status, minConfidence, tags, search } = req.query;
    
    // Build query
    const query: any = { isActive: true };
    
    // Project filter
    if (projectId) {
      query.project = projectId;
      
      // Check project access
      const project = await Project.findById(projectId);
      if (!project) {
        throw createError('Project not found', 404, 'PROJECT_NOT_FOUND');
      }
      
      const userId = req.user!._id.toString();
      const hasAccess = project.owner.toString() === userId ||
        project.collaborators.some(c => c.user.toString() === userId) ||
        project.visibility === 'public';
        
      if (!hasAccess) {
        throw createError('Access denied to project', 403, 'PROJECT_ACCESS_DENIED');
      }
    } else {
      // If no project specified, only show claims from user's projects or public projects
      const userProjects = await Project.find({
        $or: [
          { owner: req.user!._id },
          { 'collaborators.user': req.user!._id },
          { visibility: 'public' }
        ],
        isActive: true
      }).select('_id');
      
      query.project = { $in: userProjects.map(p => p._id) };
    }
    
    // Additional filters
    if (type) query.type = type;
    if (status) query.status = status;
    if (minConfidence) query.confidence = { $gte: parseFloat(minConfidence as string) };
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagArray };
    }
    
    // Text search
    if (search) {
      query.$text = { $search: search as string };
    }
    
    // Check cache first
    const cacheKey = `claims:${JSON.stringify({ query, page, limit, sort, order })}`;
    interface CachedClaimsResult {
      claims: unknown[];
      pagination: Record<string, unknown>;
    }
    const cachedResult = await redisManager.get<CachedClaimsResult>(cacheKey);
    if (cachedResult) {
      res.json({
        success: true,
        data: cachedResult.claims,
        pagination: cachedResult.pagination,
        cached: true,
      });
      return;
    }
    
    // Execute query
    const skip = (Number(page) - 1) * Number(limit);
    const sortObj: any = {};
    sortObj[sort as string] = order === 'asc' ? 1 : -1;
    
    const [claims, total] = await Promise.all([
      Claim.find(query)
        .populate('creator', 'firstName lastName email')
        .populate('project', 'name visibility')
        .populate('evidence', 'text type reliability.score')
        .sort(sortObj)
        .skip(skip)
        .limit(Number(limit)),
      Claim.countDocuments(query)
    ]);
    
    const pagination = {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
      hasNext: Number(page) < Math.ceil(total / Number(limit)),
      hasPrev: Number(page) > 1,
    };
    
    // Cache result for 5 minutes
    await redisManager.set(cacheKey, { claims, pagination }, 300);
    
    res.json({
      success: true,
      data: claims,
      pagination,
    });
  })
);

// POST /api/claims - Create a new claim
router.post('/',
  authenticate,
  sanitize,
  validate(validationSchemas.createClaim),
  requireProjectAccess('canEdit'),
  asyncHandler(async (req: Request, res: Response) => {
    const claimData = {
      ...req.body,
      project: req.body.project || req.params.projectId,
      creator: req.user!._id,
    };
    
    const claim = new Claim(claimData);
    await claim.save();
    
    // Populate related data
    await claim.populate([
      { path: 'creator', select: 'firstName lastName email' },
      { path: 'project', select: 'name' },
      { path: 'evidence', select: 'text type reliability.score' }
    ]);
    
    // Update project statistics
    await Project.findByIdAndUpdate(claim.project, {
      $inc: { 'statistics.totalClaims': 1 }
    });
    
    // Update user statistics
    await req.user!.updateOne({
      $inc: { 'stats.claimsCreated': 1 }
    });
    
    // Clear related caches
    await redisManager.deletePattern('claims:*');
    await redisManager.deletePattern('projects:*');
    
    // Track activity
    await redisManager.trackUserActivity(req.user!._id.toString(), {
      action: 'create_claim',
      claimId: claim._id.toString(),
      details: { projectId: claim.project.toString() },
    });
    
    // If AI analysis is enabled, trigger ML analysis
    if (req.project?.settings?.reasoning?.enableAIGeneration) {
      try {
        const mlResponse = await axios.post(`${process.env.ML_SERVICE_URL}/validate`, {
          claim_text: claim.text,
          claim_type: claim.type,
          context: '',
          evidence: claim.evidence,
        }, {
          headers: {
            'X-API-Key': process.env.ML_SERVICE_API_KEY,
          },
          timeout: 5000,
        });
        
        // Update claim with AI analysis
        claim.quality = {
          overallScore: mlResponse.data.overall_score,
          clarityScore: mlResponse.data.clarity_score,
          specificityScore: mlResponse.data.specificity_score,
          evidenceScore: mlResponse.data.evidence_score,
          biasScore: mlResponse.data.bias_score,
          factualityScore: mlResponse.data.factuality_score,
          completenessScore: mlResponse.data.completeness_score,
          issues: mlResponse.data.issues,
          recommendations: mlResponse.data.recommendations,
        };
        
        await claim.save();
      } catch (mlError) {
        logger.warn('ML analysis failed for claim:', mlError);
      }
    }
    
    logger.info(`Claim created: ${claim._id} by ${req.user!.email}`);
    
    res.status(201).json({
      success: true,
      message: 'Claim created successfully',
      data: claim,
    });
  })
);

// GET /api/claims/:id - Get specific claim
router.get('/:id',
  authenticate,
  validate(validationSchemas.objectId, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const claim = await Claim.findOne({ _id: id, isActive: true })
      .populate('creator', 'firstName lastName email')
      .populate('project', 'name visibility owner collaborators')
      .populate('evidence', 'text type reliability.score source')
      .populate('reasoningChains', 'type steps validity.overallScore')
      .populate('relatedClaims.claimId', 'text type confidence');
    
    if (!claim) {
      throw createError('Claim not found', 404, 'CLAIM_NOT_FOUND');
    }
    
    // Check access permissions
    const userId = req.user!._id.toString();
    const project = claim.project as any;
    const hasAccess = project.owner.toString() === userId ||
      project.collaborators.some((c: any) => c.user.toString() === userId) ||
      project.visibility === 'public';
      
    if (!hasAccess) {
      throw createError('Access denied to claim', 403, 'CLAIM_ACCESS_DENIED');
    }
    
    // Track view activity
    await redisManager.trackUserActivity(userId, {
      action: 'view_claim',
      claimId: claim._id.toString(),
      details: { projectId: claim.project.toString() },
    });
    
    res.json({
      success: true,
      data: claim,
    });
  })
);

// PUT /api/claims/:id - Update claim
router.put('/:id',
  authenticate,
  sanitize,
  validate(validationSchemas.objectId, 'params'),
  validate(validationSchemas.updateClaim),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;
    
    const claim = await Claim.findOne({ _id: id, isActive: true })
      .populate('project', 'owner collaborators');
    
    if (!claim) {
      throw createError('Claim not found', 404, 'CLAIM_NOT_FOUND');
    }
    
    // Check edit permissions
    const userId = req.user!._id.toString();
    const project = claim.project as any;
    const canEdit = claim.creator.toString() === userId ||
      project.owner.toString() === userId ||
      project.collaborators.some((c: any) => 
        c.user.toString() === userId && c.permissions.canEdit
      );
      
    if (!canEdit) {
      throw createError('No permission to edit this claim', 403, 'EDIT_PERMISSION_DENIED');
    }
    
    // Store original version if text changed
    if (updates.text && updates.text !== claim.text && !claim.versions.length) {
      claim.versions.push({
        versionNumber: 1,
        text: claim.text,
        changedBy: claim.creator,
        changeReason: 'Original version',
        timestamp: claim.createdAt,
      });
    }
    
    // Update claim
    Object.assign(claim, updates);
    await claim.save();
    
    // Re-populate
    await claim.populate([
      { path: 'creator', select: 'firstName lastName email' },
      { path: 'project', select: 'name' },
      { path: 'evidence', select: 'text type reliability.score' }
    ]);
    
    // Clear caches
    await redisManager.deletePattern('claims:*');
    
    logger.info(`Claim updated: ${claim._id} by ${req.user!.email}`);
    
    res.json({
      success: true,
      message: 'Claim updated successfully',
      data: claim,
    });
  })
);

// DELETE /api/claims/:id - Delete claim (soft delete)
router.delete('/:id',
  authenticate,
  validate(validationSchemas.objectId, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const claim = await Claim.findOne({ _id: id, isActive: true })
      .populate('project', 'owner collaborators');
    
    if (!claim) {
      throw createError('Claim not found', 404, 'CLAIM_NOT_FOUND');
    }
    
    // Check delete permissions
    const userId = req.user!._id.toString();
    const project = claim.project as any;
    const canDelete = claim.creator.toString() === userId ||
      project.owner.toString() === userId ||
      project.collaborators.some((c: any) => 
        c.user.toString() === userId && c.permissions.canDelete
      );
      
    if (!canDelete) {
      throw createError('No permission to delete this claim', 403, 'DELETE_PERMISSION_DENIED');
    }
    
    // Soft delete
    claim.isActive = false;
    claim.status = 'archived';
    await claim.save();
    
    // Update project statistics
    await Project.findByIdAndUpdate(claim.project, {
      $inc: { 'statistics.totalClaims': -1 }
    });
    
    // Clear caches
    await redisManager.deletePattern('claims:*');
    
    logger.info(`Claim deleted: ${claim._id} by ${req.user!.email}`);
    
    res.json({
      success: true,
      message: 'Claim deleted successfully',
    });
  })
);

// POST /api/claims/:id/evidence - Add evidence to claim
router.post('/:id/evidence',
  authenticate,
  validate(validationSchemas.objectId, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { evidenceIds } = req.body;
    
    if (!evidenceIds || !Array.isArray(evidenceIds)) {
      throw createError('Evidence IDs array is required', 400, 'EVIDENCE_IDS_REQUIRED');
    }
    
    const claim = await Claim.findOne({ _id: id, isActive: true })
      .populate('project', 'owner collaborators');
    
    if (!claim) {
      throw createError('Claim not found', 404, 'CLAIM_NOT_FOUND');
    }
    
    // Check edit permissions
    const userId = req.user!._id.toString();
    const project = claim.project as any;
    const canEdit = claim.creator.toString() === userId ||
      project.owner.toString() === userId ||
      project.collaborators.some((c: any) => 
        c.user.toString() === userId && c.permissions.canEdit
      );
      
    if (!canEdit) {
      throw createError('No permission to edit this claim', 403, 'EDIT_PERMISSION_DENIED');
    }
    
    // Verify evidence exists and belongs to same project
    const evidence = await Evidence.find({
      _id: { $in: evidenceIds },
      project: claim.project,
      isActive: true,
    });
    
    if (evidence.length !== evidenceIds.length) {
      throw createError('Some evidence not found or not accessible', 404, 'EVIDENCE_NOT_FOUND');
    }
    
    // Add evidence to claim (avoid duplicates)
    const newEvidenceIds = evidenceIds.filter(eid => 
      !claim.evidence.some(existing => existing.toString() === eid)
    );
    
    claim.evidence.push(...newEvidenceIds);
    await claim.save();
    
    // Update evidence with claim reference
    await Evidence.updateMany(
      {
        _id: { $in: newEvidenceIds },
        claims: { $ne: claim._id }
      },
      {
        $push: { claims: claim._id }
      }
    );
    
    await claim.populate('evidence', 'text type reliability.score');
    
    res.json({
      success: true,
      message: 'Evidence added successfully',
      data: {
        claim: claim._id,
        evidence: claim.evidence,
      },
    });
  })
);

// POST /api/claims/:id/comments - Add comment to claim
router.post('/:id/comments',
  authenticate,
  sanitize,
  validate(validationSchemas.objectId, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { text } = req.body;
    
    if (!text || text.trim().length < 1) {
      throw createError('Comment text is required', 400, 'COMMENT_TEXT_REQUIRED');
    }
    
    const claim = await Claim.findOne({ _id: id, isActive: true })
      .populate('project', 'owner collaborators settings');
    
    if (!claim) {
      throw createError('Claim not found', 404, 'CLAIM_NOT_FOUND');
    }
    
    // Check if comments are allowed
    const project = claim.project as any;
    if (!project.settings.collaboration.allowComments) {
      throw createError('Comments are not allowed on this project', 403, 'COMMENTS_DISABLED');
    }
    
    // Check access permissions
    const userId = req.user!._id.toString();
    const hasAccess = project.owner.toString() === userId ||
      project.collaborators.some((c: any) => c.user.toString() === userId) ||
      project.visibility === 'public';
      
    if (!hasAccess) {
      throw createError('Access denied to claim', 403, 'CLAIM_ACCESS_DENIED');
    }
    
    // Add comment
    claim.comments.push({
      user: req.user!._id,
      text: text.trim(),
      timestamp: new Date(),
      resolved: false,
      replies: [],
    });
    
    await claim.save();
    await claim.populate('comments.user', 'firstName lastName email');
    
    const newComment = claim.comments[claim.comments.length - 1];
    
    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: newComment,
    });
  })
);

// POST /api/claims/relate - Create relationships between claims
router.post('/relate',
  authenticate,
  sanitize,
  validate(validationSchemas.relateClaimsRequest),
  asyncHandler(async (req: Request, res: Response) => {
    const { claimIds, relationship, confidence, notes } = req.body;
    
    // Get all claims
    const claims = await Claim.find({
      _id: { $in: claimIds },
      isActive: true,
    }).populate('project', 'owner collaborators');
    
    if (claims.length !== claimIds.length) {
      throw createError('Some claims not found', 404, 'CLAIMS_NOT_FOUND');
    }
    
    // Check permissions for all claims
    const userId = req.user!._id.toString();
    for (const claim of claims) {
      const project = claim.project as any;
      const canEdit = claim.creator.toString() === userId ||
        project.owner.toString() === userId ||
        project.collaborators.some((c: any) => 
          c.user.toString() === userId && c.permissions.canEdit
        );
        
      if (!canEdit) {
        throw createError(`No permission to edit claim ${claim._id}`, 403, 'EDIT_PERMISSION_DENIED');
      }
    }
    
    // Create relationships
    const relationshipUpdates = [];
    
    for (let i = 0; i < claims.length; i++) {
      for (let j = i + 1; j < claims.length; j++) {
        const claim1 = claims[i];
        const claim2 = claims[j];
        
        // Add relationship from claim1 to claim2
        claim1.relatedClaims.push({
          claimId: claim2._id,
          relationship,
          confidence,
          notes,
        });
        
        // Add reverse relationship (if different type needed)
        let reverseRelationship = relationship;
        if (relationship === 'supports') reverseRelationship = 'supports';
        else if (relationship === 'contradicts') reverseRelationship = 'contradicts';
        
        claim2.relatedClaims.push({
          claimId: claim1._id,
          relationship: reverseRelationship,
          confidence,
          notes,
        });
        
        relationshipUpdates.push(claim1.save(), claim2.save());
      }
    }
    
    await Promise.all(relationshipUpdates);
    
    // Clear caches
    await redisManager.deletePattern('claims:*');
    
    res.json({
      success: true,
      message: 'Claims related successfully',
      data: {
        relationship,
        claimIds,
        confidence,
      },
    });
  })
);

// GET /api/claims/:id/analysis - Get AI analysis for claim
router.get('/:id/analysis',
  authenticate,
  validate(validationSchemas.objectId, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const claim = await Claim.findOne({ _id: id, isActive: true })
      .populate('evidence', 'text type');
    
    if (!claim) {
      throw createError('Claim not found', 404, 'CLAIM_NOT_FOUND');
    }
    
    // Check cache first
    const cacheKey = `claim_analysis:${id}`;
    const cachedAnalysis = await redisManager.get(cacheKey);
    if (cachedAnalysis) {
      res.json({
        success: true,
        data: cachedAnalysis,
        cached: true,
      });
      return;
    }
    
    try {
      // Call ML service for detailed analysis
      const [qualityResponse, reasoningResponse] = await Promise.all([
        axios.post(`${process.env.ML_SERVICE_URL}/validate`, {
          claim_text: claim.text,
          claim_type: claim.type,
          evidence: claim.evidence.map((e: any) => e.text),
        }, {
          headers: { 'X-API-Key': process.env.ML_SERVICE_API_KEY },
          timeout: 10000,
        }),
        
        axios.post(`${process.env.ML_SERVICE_URL}/reasoning/generate`, {
          claim: claim.text,
          evidence: claim.evidence.map((e: any) => e.text),
          reasoning_type: 'deductive',
          complexity: 'intermediate',
        }, {
          headers: { 'X-API-Key': process.env.ML_SERVICE_API_KEY },
          timeout: 15000,
        })
      ]);
      
      const analysis = {
        quality: qualityResponse.data,
        reasoning: reasoningResponse.data,
        timestamp: new Date(),
      };
      
      // Cache for 1 hour
      await redisManager.set(cacheKey, analysis, 3600);
      
      res.json({
        success: true,
        data: analysis,
      });
      
    } catch (mlError) {
      logger.error('ML analysis failed:', mlError);
      throw createError('Analysis service unavailable', 503, 'ANALYSIS_SERVICE_UNAVAILABLE');
    }
  })
);

export default router;