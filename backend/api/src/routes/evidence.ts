import express from 'express';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Evidence from '../models/Evidence';
import Claim from '../models/Claim';
import Project from '../models/Project';
import { authenticate, requireProjectAccess } from '../middleware/auth';
import { validate, validationSchemas, sanitize, validatePagination } from '../middleware/validation';
import { asyncHandler, createError } from '../middleware/errorHandler';
import redisManager from '../config/redis';
import { logger } from '../utils/logger';
import { VALIDATION_LIMITS, EVIDENCE_ERROR_MESSAGES } from '../constants/validation';

const router = express.Router();

/**
 * Check if user has access to a project
 */
async function checkProjectAccess(projectId: string, userId?: string): Promise<boolean> {
  const project = await Project.findById(projectId);
  if (!project || !project.isActive) {
    return false;
  }

  // Public projects are accessible to all
  if (project.visibility === 'public') {
    return true;
  }

  // For private/team projects, user must be authenticated
  if (!userId) {
    return false;
  }

  // Check if user is owner or collaborator
  const isOwner = project.owner.toString() === userId;
  const isCollaborator = project.collaborators.some(
    (c: any) => c.user.toString() === userId
  );

  return isOwner || isCollaborator;
}

/**
 * Check if user can edit evidence in a project
 */
async function checkEditPermission(
  projectId: string,
  userId: string,
  evidenceAddedBy?: string
): Promise<boolean> {
  const project = await Project.findById(projectId);
  if (!project || !project.isActive) {
    return false;
  }

  // Owner can always edit
  if (project.owner.toString() === userId) {
    return true;
  }

  // Creator of the evidence can edit
  if (evidenceAddedBy && evidenceAddedBy === userId) {
    return true;
  }

  // Check collaborator edit permissions
  const collaborator = project.collaborators.find(
    (c: any) => c.user.toString() === userId
  );

  return collaborator?.permissions?.canEdit === true;
}

// ============================================================================
// SPECIFIC ROUTES (must come before parameterized routes)
// ============================================================================

/**
 * GET /api/evidence/project/:projectId/stats - Get evidence statistics for a project
 */
router.get('/project/:projectId/stats',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;

    // Validate projectId
    if (!/^[0-9a-fA-F]{24}$/.test(projectId)) {
      throw createError('Invalid project ID format', 400, 'INVALID_PROJECT_ID');
    }

    // Check project access
    const hasAccess = await checkProjectAccess(projectId, req.user!._id.toString());
    if (!hasAccess) {
      throw createError(
        EVIDENCE_ERROR_MESSAGES.ACCESS_DENIED,
        403,
        'PROJECT_ACCESS_DENIED'
      );
    }

    // Check cache
    const cacheKey = `evidence:stats:${projectId}`;
    const cachedResult = await redisManager.get(cacheKey);
    if (cachedResult) {
      res.json({
        success: true,
        data: cachedResult,
        cached: true,
      });
      return;
    }

    // Aggregate statistics
    const projectObjectId = new mongoose.Types.ObjectId(projectId);
    const stats = await Evidence.aggregate([
      { $match: { project: projectObjectId, isActive: true } },
      {
        $group: {
          _id: null,
          totalEvidence: { $sum: 1 },
          avgReliability: { $avg: '$reliability.score' },
          avgRelevance: { $avg: '$relevance.score' },
          avgQuality: { $avg: '$quality.overallScore' },
          verified: { $sum: { $cond: [{ $eq: ['$verification.status', 'verified'] }, 1, 0] } },
          disputed: { $sum: { $cond: [{ $eq: ['$verification.status', 'disputed'] }, 1, 0] } },
          unverified: { $sum: { $cond: [{ $eq: ['$verification.status', 'unverified'] }, 1, 0] } },
          byType: { $push: '$type' },
          bySourceType: { $push: '$source.type' },
        },
      },
    ]);

    const typeStats = await Evidence.aggregate([
      { $match: { project: projectObjectId, isActive: true } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    const sourceTypeStats = await Evidence.aggregate([
      { $match: { project: projectObjectId, isActive: true } },
      { $group: { _id: '$source.type', count: { $sum: 1 } } },
    ]);

    const result = {
      totalEvidence: stats[0]?.totalEvidence || 0,
      averageReliability: stats[0]?.avgReliability || 0,
      averageRelevance: stats[0]?.avgRelevance || 0,
      averageQuality: stats[0]?.avgQuality || 0,
      verificationStatus: {
        verified: stats[0]?.verified || 0,
        disputed: stats[0]?.disputed || 0,
        unverified: stats[0]?.unverified || 0,
      },
      byType: typeStats.reduce((acc, { _id, count }) => {
        if (_id) acc[_id] = count;
        return acc;
      }, {} as Record<string, number>),
      bySourceType: sourceTypeStats.reduce((acc, { _id, count }) => {
        if (_id) acc[_id] = count;
        return acc;
      }, {} as Record<string, number>),
    };

    // Cache for 2 minutes
    await redisManager.set(cacheKey, result, 120);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/evidence/search - Search evidence by text
 *
 * Query params:
 * - q: Search query (required)
 * - projectId: Optional project filter
 * - limit: Max results (default 20)
 */
router.get('/search',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { q, projectId, limit = 20 } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      throw createError(
        'Search query must be at least 2 characters',
        400,
        'INVALID_SEARCH_QUERY'
      );
    }

    // Build search conditions
    const searchConditions: any = {
      $text: { $search: q.trim() },
      isActive: true,
    };

    // Add project filter if provided
    if (projectId) {
      const hasAccess = await checkProjectAccess(
        projectId as string,
        req.user!._id.toString()
      );

      if (!hasAccess) {
        throw createError(
          EVIDENCE_ERROR_MESSAGES.ACCESS_DENIED,
          403,
          'PROJECT_ACCESS_DENIED'
        );
      }

      searchConditions.project = projectId;
    } else {
      // Limit to user's accessible projects
      const userProjects = await Project.find({
        $or: [
          { owner: req.user!._id },
          { 'collaborators.user': req.user!._id },
          { visibility: 'public' },
        ],
        isActive: true,
      }).select('_id');

      searchConditions.project = { $in: userProjects.map((p) => p._id) };
    }

    // Execute search
    const evidence = await Evidence.find(
      searchConditions,
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(Math.min(Number(limit), VALIDATION_LIMITS.SEARCH_MAX_RESULTS))
      .populate('addedBy', 'firstName lastName email')
      .populate('project', 'name');

    res.json({
      success: true,
      data: evidence,
      meta: {
        query: q,
        count: evidence.length,
        limit: Number(limit),
      },
    });
  })
);

/**
 * GET /api/evidence/claim/:claimId - Get all evidence for a specific claim
 */
router.get('/claim/:claimId',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { claimId } = req.params;

    // Validate claimId format
    if (!/^[0-9a-fA-F]{24}$/.test(claimId)) {
      throw createError('Invalid claim ID format', 400, 'INVALID_CLAIM_ID');
    }

    // Check cache first
    const cacheKey = `evidence:claim:${claimId}:${req.user!._id.toString()}`;
    const cachedResult = await redisManager.get(cacheKey);
    if (cachedResult) {
      res.json({
        success: true,
        data: cachedResult,
        cached: true,
      });
      return;
    }

    // Find the claim and verify access
    const claim = await Claim.findOne({ _id: claimId, isActive: true })
      .populate('project', 'owner collaborators visibility');

    if (!claim) {
      throw createError('Claim not found', 404, 'CLAIM_NOT_FOUND');
    }

    // Check project access
    const project = claim.project as any;
    const userId = req.user!._id.toString();
    const hasAccess = project.visibility === 'public' ||
      project.owner.toString() === userId ||
      project.collaborators.some((c: any) => c.user.toString() === userId);

    if (!hasAccess) {
      throw createError(
        EVIDENCE_ERROR_MESSAGES.ACCESS_DENIED,
        403,
        'CLAIM_ACCESS_DENIED'
      );
    }

    // Find all evidence linked to this claim
    const evidence = await Evidence.find({
      claims: claimId,
      isActive: true,
    })
      .populate('addedBy', 'firstName lastName email')
      .populate('verification.verifiedBy', 'firstName lastName email')
      .sort({ 'reliability.score': -1, createdAt: -1 });

    // Cache result
    await redisManager.set(cacheKey, evidence, VALIDATION_LIMITS.EVIDENCE_CACHE_TTL);

    res.json({
      success: true,
      data: evidence,
      meta: {
        claimId,
        count: evidence.length,
      },
    });
  })
);

// ============================================================================
// LIST AND CRUD ROUTES
// ============================================================================

/**
 * GET /api/evidence - List evidence with filtering
 *
 * Query params:
 * - projectId: Filter by project
 * - claimId: Filter by associated claim
 * - type: Filter by evidence type
 * - status: Filter by verification status
 * - minReliability: Minimum reliability score
 * - search: Text search query
 * - page: Page number (default 1)
 * - limit: Items per page (default 20, max 100)
 * - sort: Sort field (default 'updatedAt')
 * - order: Sort order 'asc' or 'desc' (default 'desc')
 */
router.get('/',
  authenticate,
  validatePagination,
  asyncHandler(async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 20,
      sort = 'updatedAt',
      order = 'desc',
      projectId,
      claimId,
      type,
      status,
      minReliability,
      search,
      tags,
    } = req.query;

    // Build query
    const query: any = { isActive: true };

    // Project filter with access check
    if (projectId) {
      const hasAccess = await checkProjectAccess(
        projectId as string,
        req.user!._id.toString()
      );

      if (!hasAccess) {
        throw createError(
          EVIDENCE_ERROR_MESSAGES.ACCESS_DENIED,
          403,
          'PROJECT_ACCESS_DENIED'
        );
      }

      query.project = projectId;
    } else {
      // If no project specified, show evidence from user's accessible projects
      const userProjects = await Project.find({
        $or: [
          { owner: req.user!._id },
          { 'collaborators.user': req.user!._id },
          { visibility: 'public' },
        ],
        isActive: true,
      }).select('_id');

      query.project = { $in: userProjects.map((p) => p._id) };
    }

    // Claim filter
    if (claimId) {
      query.claims = claimId;
    }

    // Type filter
    if (type) {
      query.type = type;
    }

    // Verification status filter
    if (status) {
      query['verification.status'] = status;
    }

    // Minimum reliability filter
    if (minReliability) {
      query['reliability.score'] = { $gte: parseFloat(minReliability as string) };
    }

    // Tags filter
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagArray };
    }

    // Text search
    if (search) {
      query.$text = { $search: search as string };
    }

    // Build cache key
    const cacheKey = `evidence:list:${JSON.stringify({
      query,
      page,
      limit,
      sort,
      order,
      userId: req.user!._id.toString(),
    })}`;

    // Check cache first
    const cachedResult = await redisManager.get(cacheKey);
    if (cachedResult) {
      logger.debug('Evidence list served from cache', { cacheKey });
      res.json({
        success: true,
        data: cachedResult.evidence,
        pagination: cachedResult.pagination,
        cached: true,
      });
      return;
    }

    // Execute query with pagination
    const skip = (Number(page) - 1) * Number(limit);
    const sortObj: any = {};
    sortObj[sort as string] = order === 'asc' ? 1 : -1;

    const [evidence, total] = await Promise.all([
      Evidence.find(query)
        .populate('addedBy', 'firstName lastName email')
        .populate('project', 'name visibility')
        .populate('claims', 'text type confidence')
        .sort(sortObj)
        .skip(skip)
        .limit(Math.min(Number(limit), VALIDATION_LIMITS.MAX_PAGE_SIZE)),
      Evidence.countDocuments(query),
    ]);

    const pagination = {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
      hasNext: Number(page) < Math.ceil(total / Number(limit)),
      hasPrev: Number(page) > 1,
    };

    // Cache result
    await redisManager.set(
      cacheKey,
      { evidence, pagination },
      VALIDATION_LIMITS.EVIDENCE_CACHE_TTL
    );

    logger.info('Evidence list fetched', {
      count: evidence.length,
      total,
      projectId,
      userId: req.user!._id.toString(),
    });

    res.json({
      success: true,
      data: evidence,
      pagination,
    });
  })
);

/**
 * GET /api/evidence/:id - Get single evidence by ID
 */
router.get('/:id',
  authenticate,
  validate(validationSchemas.objectId, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Check cache first
    const cacheKey = `evidence:${id}:${req.user!._id.toString()}`;
    const cachedResult = await redisManager.get(cacheKey);
    if (cachedResult) {
      res.json({
        success: true,
        data: cachedResult,
        cached: true,
      });
      return;
    }

    // Fetch evidence with relationships
    const evidence = await Evidence.findOne({ _id: id, isActive: true })
      .populate('addedBy', 'firstName lastName email')
      .populate('project', 'name visibility owner collaborators')
      .populate('claims', 'text type confidence status')
      .populate('annotations.user', 'firstName lastName email')
      .populate('relationships.evidenceId', 'text type reliability.score')
      .populate('verification.verifiedBy', 'firstName lastName email');

    if (!evidence) {
      throw createError(
        EVIDENCE_ERROR_MESSAGES.NOT_FOUND,
        404,
        'EVIDENCE_NOT_FOUND'
      );
    }

    // Check project access
    const project = evidence.project as any;
    const userId = req.user!._id.toString();
    const hasAccess = project.visibility === 'public' ||
      project.owner.toString() === userId ||
      project.collaborators.some((c: any) => c.user.toString() === userId);

    if (!hasAccess) {
      throw createError(
        EVIDENCE_ERROR_MESSAGES.ACCESS_DENIED,
        403,
        'EVIDENCE_ACCESS_DENIED'
      );
    }

    // Cache result
    await redisManager.set(cacheKey, evidence, VALIDATION_LIMITS.EVIDENCE_CACHE_TTL);

    // Track view activity
    await redisManager.trackUserActivity(userId, {
      action: 'view_evidence',
      evidenceId: evidence._id,
      projectId: evidence.project,
    });

    res.json({
      success: true,
      data: evidence,
    });
  })
);

/**
 * POST /api/evidence - Create new evidence
 *
 * Body:
 * - projectId: Project to add evidence to (required)
 * - claimIds: Array of claim IDs to link (optional)
 * - text: Evidence text (required)
 * - type: Evidence type (required)
 * - source: Source information (required)
 * - reliability: Reliability assessment (required)
 * - relevance: Relevance assessment (required)
 * - keywords: Array of keywords (optional)
 * - tags: Array of tags (optional)
 */
router.post('/',
  authenticate,
  sanitize,
  validate(validationSchemas.createEvidence),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      projectId,
      claimIds,
      text,
      type,
      source,
      reliability,
      relevance,
      keywords,
      tags,
    } = req.body;

    // Check project access
    const project = await Project.findById(projectId);
    if (!project || !project.isActive) {
      throw createError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    const userId = req.user!._id.toString();
    const hasAccess = await checkEditPermission(projectId, userId);

    if (!hasAccess) {
      throw createError(
        EVIDENCE_ERROR_MESSAGES.ACCESS_DENIED,
        403,
        'PROJECT_EDIT_DENIED'
      );
    }

    // Validate claims exist and belong to same project
    let validClaimIds: string[] = [];
    if (claimIds && claimIds.length > 0) {
      const claims = await Claim.find({
        _id: { $in: claimIds },
        project: projectId,
        isActive: true,
      });

      if (claims.length !== claimIds.length) {
        throw createError(
          EVIDENCE_ERROR_MESSAGES.CLAIM_NOT_FOUND,
          404,
          'CLAIM_NOT_FOUND'
        );
      }

      validClaimIds = claims.map((c) => c._id.toString());
    }

    // Create evidence
    const evidence = new Evidence({
      text,
      type,
      source,
      reliability,
      relevance,
      keywords: keywords || [],
      tags: tags || [],
      project: projectId,
      addedBy: req.user!._id,
      claims: validClaimIds,
      metadata: {
        confidence: reliability.score,
        processingDate: new Date(),
      },
    });

    await evidence.save();

    // Update claims to include this evidence
    if (validClaimIds.length > 0) {
      await Claim.updateMany(
        { _id: { $in: validClaimIds } },
        { $addToSet: { evidence: evidence._id } }
      );
    }

    // Update project statistics
    await Project.findByIdAndUpdate(projectId, {
      $inc: { 'statistics.totalEvidence': 1 },
    });

    // Populate for response
    await evidence.populate([
      { path: 'addedBy', select: 'firstName lastName email' },
      { path: 'project', select: 'name' },
      { path: 'claims', select: 'text type confidence' },
    ]);

    // Clear related caches
    await redisManager.deletePattern('evidence:*');
    await redisManager.deletePattern('claims:*');
    await redisManager.deletePattern('graph:*');

    // Track activity
    await redisManager.trackUserActivity(userId, {
      action: 'create_evidence',
      evidenceId: evidence._id,
      projectId,
      linkedClaims: validClaimIds.length,
    });

    logger.info(`Evidence created: ${evidence._id} by ${req.user!.email}`, {
      projectId,
      claimCount: validClaimIds.length,
    });

    res.status(201).json({
      success: true,
      message: 'Evidence created successfully',
      data: evidence,
    });
  })
);

/**
 * PUT /api/evidence/:id - Update evidence
 */
router.put('/:id',
  authenticate,
  sanitize,
  validate(validationSchemas.objectId, 'params'),
  validate(validationSchemas.updateEvidence),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    // Find evidence
    const evidence = await Evidence.findOne({ _id: id, isActive: true })
      .populate('project', 'owner collaborators');

    if (!evidence) {
      throw createError(
        EVIDENCE_ERROR_MESSAGES.NOT_FOUND,
        404,
        'EVIDENCE_NOT_FOUND'
      );
    }

    // Check if evidence is retracted
    if (evidence.verification.status === 'retracted') {
      throw createError(
        EVIDENCE_ERROR_MESSAGES.CANNOT_MODIFY_RETRACTED,
        403,
        'CANNOT_MODIFY_RETRACTED'
      );
    }

    // Check edit permissions
    const userId = req.user!._id.toString();
    const canEdit = await checkEditPermission(
      evidence.project._id.toString(),
      userId,
      evidence.addedBy.toString()
    );

    if (!canEdit) {
      throw createError(
        'No permission to edit this evidence',
        403,
        'EDIT_PERMISSION_DENIED'
      );
    }

    // Apply updates
    const allowedUpdates = [
      'text',
      'type',
      'source',
      'reliability',
      'relevance',
      'keywords',
      'tags',
    ];

    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        (evidence as any)[key] = updates[key];
      }
    }

    await evidence.save();

    // Re-populate for response
    await evidence.populate([
      { path: 'addedBy', select: 'firstName lastName email' },
      { path: 'project', select: 'name' },
      { path: 'claims', select: 'text type confidence' },
    ]);

    // Clear caches
    await redisManager.deletePattern('evidence:*');
    await redisManager.deletePattern('graph:*');

    // Track activity
    await redisManager.trackUserActivity(userId, {
      action: 'update_evidence',
      evidenceId: evidence._id,
      projectId: evidence.project,
      updatedFields: Object.keys(updates),
    });

    logger.info(`Evidence updated: ${evidence._id} by ${req.user!.email}`);

    res.json({
      success: true,
      message: 'Evidence updated successfully',
      data: evidence,
    });
  })
);

/**
 * DELETE /api/evidence/:id - Soft delete evidence
 */
router.delete('/:id',
  authenticate,
  validate(validationSchemas.objectId, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Find evidence
    const evidence = await Evidence.findOne({ _id: id, isActive: true })
      .populate('project', 'owner collaborators');

    if (!evidence) {
      throw createError(
        EVIDENCE_ERROR_MESSAGES.NOT_FOUND,
        404,
        'EVIDENCE_NOT_FOUND'
      );
    }

    // Check delete permissions
    const userId = req.user!._id.toString();
    const project = evidence.project as any;
    const canDelete = evidence.addedBy.toString() === userId ||
      project.owner.toString() === userId ||
      project.collaborators.some((c: any) =>
        c.user.toString() === userId && c.permissions?.canDelete
      );

    if (!canDelete) {
      throw createError(
        'No permission to delete this evidence',
        403,
        'DELETE_PERMISSION_DENIED'
      );
    }

    // Soft delete
    evidence.isActive = false;
    await evidence.save();

    // Remove evidence reference from linked claims
    if (evidence.claims && evidence.claims.length > 0) {
      await Claim.updateMany(
        { _id: { $in: evidence.claims } },
        { $pull: { evidence: evidence._id } }
      );
    }

    // Update project statistics
    await Project.findByIdAndUpdate(evidence.project._id, {
      $inc: { 'statistics.totalEvidence': -1 },
    });

    // Clear caches
    await redisManager.deletePattern('evidence:*');
    await redisManager.deletePattern('claims:*');
    await redisManager.deletePattern('graph:*');

    // Track activity
    await redisManager.trackUserActivity(userId, {
      action: 'delete_evidence',
      evidenceId: evidence._id,
      projectId: evidence.project._id,
    });

    logger.info(`Evidence deleted: ${evidence._id} by ${req.user!.email}`);

    res.json({
      success: true,
      message: 'Evidence deleted successfully',
    });
  })
);

// ============================================================================
// SPECIAL ACTION ROUTES
// ============================================================================

/**
 * POST /api/evidence/:id/verify - Mark evidence as verified
 *
 * Body:
 * - notes: Optional verification notes
 */
router.post('/:id/verify',
  authenticate,
  validate(validationSchemas.objectId, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { notes } = req.body;

    // Find evidence
    const evidence = await Evidence.findOne({ _id: id, isActive: true })
      .populate('project', 'owner collaborators');

    if (!evidence) {
      throw createError(
        EVIDENCE_ERROR_MESSAGES.NOT_FOUND,
        404,
        'EVIDENCE_NOT_FOUND'
      );
    }

    // Check if already verified
    if (evidence.verification.status === 'verified') {
      throw createError(
        EVIDENCE_ERROR_MESSAGES.ALREADY_VERIFIED,
        400,
        'ALREADY_VERIFIED'
      );
    }

    // Only project owner or admins can verify
    const userId = req.user!._id.toString();
    const project = evidence.project as any;
    const canVerify = project.owner.toString() === userId ||
      project.collaborators.some((c: any) =>
        c.user.toString() === userId && c.role === 'admin'
      );

    if (!canVerify) {
      throw createError(
        'Only project owners or admins can verify evidence',
        403,
        'VERIFY_PERMISSION_DENIED'
      );
    }

    // Update verification status using the model method
    await evidence.verify(userId, notes);

    // Re-populate for response
    await evidence.populate([
      { path: 'addedBy', select: 'firstName lastName email' },
      { path: 'verification.verifiedBy', select: 'firstName lastName email' },
      { path: 'project', select: 'name' },
    ]);

    // Clear caches
    await redisManager.deletePattern('evidence:*');

    // Track activity
    await redisManager.trackUserActivity(userId, {
      action: 'verify_evidence',
      evidenceId: evidence._id,
      projectId: evidence.project,
    });

    logger.info(`Evidence verified: ${evidence._id} by ${req.user!.email}`);

    res.json({
      success: true,
      message: 'Evidence verified successfully',
      data: evidence,
    });
  })
);

/**
 * POST /api/evidence/:id/dispute - Mark evidence as disputed
 *
 * Body:
 * - reasons: Array of dispute reasons (required)
 */
router.post('/:id/dispute',
  authenticate,
  validate(validationSchemas.objectId, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reasons } = req.body;

    // Validate reasons
    if (!reasons || !Array.isArray(reasons) || reasons.length === 0) {
      throw createError(
        'Dispute reasons are required',
        400,
        'REASONS_REQUIRED'
      );
    }

    // Find evidence
    const evidence = await Evidence.findOne({ _id: id, isActive: true })
      .populate('project', 'owner collaborators');

    if (!evidence) {
      throw createError(
        EVIDENCE_ERROR_MESSAGES.NOT_FOUND,
        404,
        'EVIDENCE_NOT_FOUND'
      );
    }

    // Check project access (any project member can dispute)
    const userId = req.user!._id.toString();
    const hasAccess = await checkProjectAccess(
      evidence.project._id.toString(),
      userId
    );

    if (!hasAccess) {
      throw createError(
        EVIDENCE_ERROR_MESSAGES.ACCESS_DENIED,
        403,
        'PROJECT_ACCESS_DENIED'
      );
    }

    // Use the model's dispute method
    await evidence.dispute(reasons);

    // Re-populate for response
    await evidence.populate([
      { path: 'addedBy', select: 'firstName lastName email' },
      { path: 'project', select: 'name' },
    ]);

    // Clear caches
    await redisManager.deletePattern('evidence:*');

    // Track activity
    await redisManager.trackUserActivity(userId, {
      action: 'dispute_evidence',
      evidenceId: evidence._id,
      projectId: evidence.project,
      reasonCount: reasons.length,
    });

    logger.info(`Evidence disputed: ${evidence._id} by ${req.user!.email}`);

    res.json({
      success: true,
      message: 'Evidence marked as disputed',
      data: evidence,
    });
  })
);

/**
 * POST /api/evidence/:id/annotations - Add annotation to evidence
 *
 * Body:
 * - text: Annotation text (required)
 * - type: Annotation type (comment, highlight, question, suggestion)
 * - position: Optional position in evidence text
 */
router.post('/:id/annotations',
  authenticate,
  validate(validationSchemas.objectId, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { text, type = 'comment', position } = req.body;

    // Validate annotation text
    if (!text || typeof text !== 'string' || text.trim().length < 1) {
      throw createError(
        'Annotation text is required',
        400,
        'ANNOTATION_TEXT_REQUIRED'
      );
    }

    // Validate annotation type
    const validTypes = ['comment', 'highlight', 'question', 'suggestion'];
    if (!validTypes.includes(type)) {
      throw createError(
        `Invalid annotation type. Must be one of: ${validTypes.join(', ')}`,
        400,
        'INVALID_ANNOTATION_TYPE'
      );
    }

    // Find evidence
    const evidence = await Evidence.findOne({ _id: id, isActive: true })
      .populate('project', 'owner collaborators visibility');

    if (!evidence) {
      throw createError(
        EVIDENCE_ERROR_MESSAGES.NOT_FOUND,
        404,
        'EVIDENCE_NOT_FOUND'
      );
    }

    // Check project access
    const userId = req.user!._id.toString();
    const hasAccess = await checkProjectAccess(
      evidence.project._id.toString(),
      userId
    );

    if (!hasAccess) {
      throw createError(
        EVIDENCE_ERROR_MESSAGES.ACCESS_DENIED,
        403,
        'PROJECT_ACCESS_DENIED'
      );
    }

    // Check annotation limit
    if (evidence.annotations.length >= VALIDATION_LIMITS.EVIDENCE_MAX_ANNOTATIONS) {
      throw createError(
        EVIDENCE_ERROR_MESSAGES.MAX_ANNOTATIONS_REACHED,
        400,
        'MAX_ANNOTATIONS_REACHED'
      );
    }

    // Add annotation
    evidence.annotations.push({
      user: req.user!._id,
      text: text.trim(),
      type,
      position,
      createdAt: new Date(),
    });

    await evidence.save();

    // Re-populate for response
    await evidence.populate([
      { path: 'annotations.user', select: 'firstName lastName email' },
    ]);

    // Clear caches
    await redisManager.deletePattern(`evidence:${id}:*`);

    // Track activity
    await redisManager.trackUserActivity(userId, {
      action: 'add_annotation',
      evidenceId: evidence._id,
      annotationType: type,
    });

    res.status(201).json({
      success: true,
      message: 'Annotation added successfully',
      data: evidence.annotations[evidence.annotations.length - 1],
    });
  })
);

/**
 * POST /api/evidence/:id/relationships - Add relationship to another evidence
 *
 * Body:
 * - targetId: ID of the target evidence (required)
 * - type: Relationship type (supports, contradicts, related, extends)
 * - confidence: Confidence score 0-1 (optional, default 0.8)
 * - notes: Optional notes about the relationship
 */
router.post('/:id/relationships',
  authenticate,
  validate(validationSchemas.objectId, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { targetId, type, confidence = 0.8, notes } = req.body;

    // Validate targetId
    if (!targetId || !/^[0-9a-fA-F]{24}$/.test(targetId)) {
      throw createError(
        'Valid target evidence ID is required',
        400,
        'INVALID_TARGET_ID'
      );
    }

    // Cannot create relationship to self
    if (id === targetId) {
      throw createError(
        'Cannot create relationship to self',
        400,
        'SELF_RELATIONSHIP'
      );
    }

    // Validate relationship type
    const validTypes = ['supports', 'contradicts', 'related', 'extends'];
    if (!type || !validTypes.includes(type)) {
      throw createError(
        `Invalid relationship type. Must be one of: ${validTypes.join(', ')}`,
        400,
        'INVALID_RELATIONSHIP_TYPE'
      );
    }

    // Find source evidence
    const evidence = await Evidence.findOne({ _id: id, isActive: true })
      .populate('project', 'owner collaborators');

    if (!evidence) {
      throw createError(
        EVIDENCE_ERROR_MESSAGES.NOT_FOUND,
        404,
        'EVIDENCE_NOT_FOUND'
      );
    }

    // Find target evidence
    const targetEvidence = await Evidence.findOne({ _id: targetId, isActive: true });

    if (!targetEvidence) {
      throw createError(
        'Target evidence not found',
        404,
        'TARGET_EVIDENCE_NOT_FOUND'
      );
    }

    // Ensure both evidence items are in the same project
    if (evidence.project._id.toString() !== targetEvidence.project.toString()) {
      throw createError(
        'Cannot create relationship between evidence in different projects',
        400,
        'CROSS_PROJECT_RELATIONSHIP'
      );
    }

    // Check edit permissions
    const userId = req.user!._id.toString();
    const canEdit = await checkEditPermission(
      evidence.project._id.toString(),
      userId,
      evidence.addedBy.toString()
    );

    if (!canEdit) {
      throw createError(
        'No permission to modify this evidence',
        403,
        'EDIT_PERMISSION_DENIED'
      );
    }

    // Check relationship limit
    if (evidence.relationships.length >= VALIDATION_LIMITS.EVIDENCE_MAX_RELATIONSHIPS) {
      throw createError(
        EVIDENCE_ERROR_MESSAGES.MAX_RELATIONSHIPS_REACHED,
        400,
        'MAX_RELATIONSHIPS_REACHED'
      );
    }

    // Check for existing relationship
    const existingRelation = evidence.relationships.find(
      (r: any) => r.evidenceId.toString() === targetId
    );

    if (existingRelation) {
      throw createError(
        'Relationship to this evidence already exists',
        400,
        'RELATIONSHIP_EXISTS'
      );
    }

    // Add relationship
    evidence.relationships.push({
      evidenceId: targetId,
      type,
      confidence: Math.min(1, Math.max(0, confidence)),
      notes,
      createdAt: new Date(),
    });

    await evidence.save();

    // Optionally add reciprocal relationship for certain types
    if (type === 'related') {
      const reciprocalExists = targetEvidence.relationships.find(
        (r: any) => r.evidenceId.toString() === id
      );

      if (!reciprocalExists && targetEvidence.relationships.length < VALIDATION_LIMITS.EVIDENCE_MAX_RELATIONSHIPS) {
        targetEvidence.relationships.push({
          evidenceId: id,
          type: 'related',
          confidence: Math.min(1, Math.max(0, confidence)),
          notes,
          createdAt: new Date(),
        });
        await targetEvidence.save();
      }
    }

    // Clear caches
    await redisManager.deletePattern('evidence:*');
    await redisManager.deletePattern('graph:*');

    // Track activity
    await redisManager.trackUserActivity(userId, {
      action: 'add_relationship',
      evidenceId: evidence._id,
      targetId,
      relationshipType: type,
    });

    res.status(201).json({
      success: true,
      message: 'Relationship added successfully',
      data: evidence.relationships[evidence.relationships.length - 1],
    });
  })
);

/**
 * POST /api/evidence/:id/claims - Link claims to evidence
 *
 * Body:
 * - claimIds: Array of claim IDs to link (required)
 * - action: 'add' or 'remove' (default 'add')
 */
router.post('/:id/claims',
  authenticate,
  validate(validationSchemas.objectId, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { claimIds, action = 'add' } = req.body;

    // Validate claimIds
    if (!claimIds || !Array.isArray(claimIds) || claimIds.length === 0) {
      throw createError(
        'Claim IDs array is required',
        400,
        'CLAIM_IDS_REQUIRED'
      );
    }

    // Validate action
    if (!['add', 'remove'].includes(action)) {
      throw createError(
        'Action must be "add" or "remove"',
        400,
        'INVALID_ACTION'
      );
    }

    // Find evidence
    const evidence = await Evidence.findOne({ _id: id, isActive: true })
      .populate('project', 'owner collaborators');

    if (!evidence) {
      throw createError(
        EVIDENCE_ERROR_MESSAGES.NOT_FOUND,
        404,
        'EVIDENCE_NOT_FOUND'
      );
    }

    // Check edit permissions
    const userId = req.user!._id.toString();
    const canEdit = await checkEditPermission(
      evidence.project._id.toString(),
      userId,
      evidence.addedBy.toString()
    );

    if (!canEdit) {
      throw createError(
        'No permission to modify this evidence',
        403,
        'EDIT_PERMISSION_DENIED'
      );
    }

    // Validate claims exist and belong to same project
    const claims = await Claim.find({
      _id: { $in: claimIds },
      project: evidence.project._id,
      isActive: true,
    });

    if (claims.length !== claimIds.length) {
      throw createError(
        'One or more claims not found or not in this project',
        404,
        'CLAIMS_NOT_FOUND'
      );
    }

    let linkedCount = 0;
    let unlinkedCount = 0;

    if (action === 'add') {
      // Add new claim links
      const newClaimIds = claimIds.filter(
        (cid: string) => !evidence.claims.some((ec: any) => ec.toString() === cid)
      );

      if (newClaimIds.length > 0) {
        evidence.claims.push(...newClaimIds);
        await evidence.save();

        // Update claims to include this evidence
        await Claim.updateMany(
          { _id: { $in: newClaimIds } },
          { $addToSet: { evidence: evidence._id } }
        );

        linkedCount = newClaimIds.length;
      }
    } else {
      // Remove claim links
      const claimsToRemove = claimIds.filter(
        (cid: string) => evidence.claims.some((ec: any) => ec.toString() === cid)
      );

      if (claimsToRemove.length > 0) {
        evidence.claims = evidence.claims.filter(
          (ec: any) => !claimsToRemove.includes(ec.toString())
        );
        await evidence.save();

        // Update claims to remove this evidence
        await Claim.updateMany(
          { _id: { $in: claimsToRemove } },
          { $pull: { evidence: evidence._id } }
        );

        unlinkedCount = claimsToRemove.length;
      }
    }

    // Clear caches
    await redisManager.deletePattern('evidence:*');
    await redisManager.deletePattern('claims:*');
    await redisManager.deletePattern('graph:*');

    // Track activity
    await redisManager.trackUserActivity(userId, {
      action: action === 'add' ? 'link_claims' : 'unlink_claims',
      evidenceId: evidence._id,
      claimCount: action === 'add' ? linkedCount : unlinkedCount,
    });

    res.json({
      success: true,
      message: action === 'add'
        ? `${linkedCount} claim(s) linked successfully`
        : `${unlinkedCount} claim(s) unlinked successfully`,
      data: {
        action,
        linkedCount,
        unlinkedCount,
        totalClaims: evidence.claims.length,
      },
    });
  })
);

/**
 * PUT /api/evidence/:id/quality - Update evidence quality assessment
 *
 * Body:
 * - overallScore: 0-1 (optional)
 * - clarityScore: 0-1 (optional)
 * - completenessScore: 0-1 (optional)
 * - issues: Array of quality issues (optional)
 * - recommendations: Array of improvement suggestions (optional)
 */
router.put('/:id/quality',
  authenticate,
  validate(validationSchemas.objectId, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { overallScore, clarityScore, completenessScore, issues, recommendations } = req.body;

    // Find evidence
    const evidence = await Evidence.findOne({ _id: id, isActive: true })
      .populate('project', 'owner collaborators');

    if (!evidence) {
      throw createError(
        EVIDENCE_ERROR_MESSAGES.NOT_FOUND,
        404,
        'EVIDENCE_NOT_FOUND'
      );
    }

    // Only project owner or admins can update quality scores
    const userId = req.user!._id.toString();
    const project = evidence.project as any;
    const canUpdateQuality = project.owner.toString() === userId ||
      project.collaborators.some((c: any) =>
        c.user.toString() === userId && (c.role === 'admin' || c.role === 'reviewer')
      );

    if (!canUpdateQuality) {
      throw createError(
        'Only project owners, admins, or reviewers can update quality scores',
        403,
        'QUALITY_UPDATE_DENIED'
      );
    }

    // Validate and update quality scores
    const validateScore = (score: any): number | undefined => {
      if (score === undefined) return undefined;
      const num = parseFloat(score);
      if (isNaN(num) || num < 0 || num > 1) {
        throw createError(
          'Quality scores must be between 0 and 1',
          400,
          'INVALID_QUALITY_SCORE'
        );
      }
      return num;
    };

    // Apply updates
    if (overallScore !== undefined) {
      evidence.quality.overallScore = validateScore(overallScore)!;
    }
    if (clarityScore !== undefined) {
      evidence.quality.clarityScore = validateScore(clarityScore)!;
    }
    if (completenessScore !== undefined) {
      evidence.quality.completenessScore = validateScore(completenessScore)!;
    }
    if (issues !== undefined) {
      if (!Array.isArray(issues)) {
        throw createError('Issues must be an array', 400, 'INVALID_ISSUES');
      }
      evidence.quality.issues = issues.filter((i: any) => typeof i === 'string');
    }
    if (recommendations !== undefined) {
      if (!Array.isArray(recommendations)) {
        throw createError('Recommendations must be an array', 400, 'INVALID_RECOMMENDATIONS');
      }
      evidence.quality.recommendations = recommendations.filter((r: any) => typeof r === 'string');
    }

    // Update lastAssessed
    evidence.quality.lastAssessed = new Date();

    await evidence.save();

    // Clear caches
    await redisManager.deletePattern(`evidence:${id}:*`);

    // Track activity
    await redisManager.trackUserActivity(userId, {
      action: 'update_quality',
      evidenceId: evidence._id,
      projectId: evidence.project,
    });

    res.json({
      success: true,
      message: 'Quality assessment updated successfully',
      data: evidence.quality,
    });
  })
);

/**
 * PUT /api/evidence/:id/usage - Track evidence usage/citation
 *
 * Body:
 * - citedIn: Array of document/claim IDs where evidence was cited
 * - usedInChain: ID of reasoning chain where evidence was used
 */
router.put('/:id/usage',
  authenticate,
  validate(validationSchemas.objectId, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { citedIn, usedInChain } = req.body;

    // Find evidence
    const evidence = await Evidence.findOne({ _id: id, isActive: true })
      .populate('project', 'owner collaborators');

    if (!evidence) {
      throw createError(
        EVIDENCE_ERROR_MESSAGES.NOT_FOUND,
        404,
        'EVIDENCE_NOT_FOUND'
      );
    }

    // Check project access
    const userId = req.user!._id.toString();
    const hasAccess = await checkProjectAccess(
      evidence.project._id.toString(),
      userId
    );

    if (!hasAccess) {
      throw createError(
        EVIDENCE_ERROR_MESSAGES.ACCESS_DENIED,
        403,
        'PROJECT_ACCESS_DENIED'
      );
    }

    // Track citations
    if (citedIn && Array.isArray(citedIn)) {
      for (const citation of citedIn) {
        if (!evidence.usage.citedIn.includes(citation)) {
          evidence.usage.citedIn.push(citation);
        }
      }
    }

    // Track usage in reasoning chains
    if (usedInChain && !evidence.usage.usedInChains.includes(usedInChain)) {
      evidence.usage.usedInChains.push(usedInChain);
    }

    // Update last used timestamp
    evidence.usage.lastUsed = new Date();

    await evidence.save();

    // Clear caches
    await redisManager.deletePattern(`evidence:${id}:*`);

    // Track activity
    await redisManager.trackUserActivity(userId, {
      action: 'track_usage',
      evidenceId: evidence._id,
    });

    res.json({
      success: true,
      message: 'Usage tracking updated',
      data: evidence.usage,
    });
  })
);

export default router;
