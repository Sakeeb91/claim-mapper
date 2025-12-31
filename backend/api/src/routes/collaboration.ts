import express from 'express';
import { Request, Response } from 'express';
import Session from '../models/Session';
import Project from '../models/Project';
import Claim from '../models/Claim';
import { authenticate, requireProjectAccess } from '../middleware/auth';
import { validate, validationSchemas, validatePagination } from '../middleware/validation';
import { asyncHandler, createError } from '../middleware/errorHandler';
import redisManager from '../config/redis';
import { logger } from '../utils/logger';

const router = express.Router();

// GET /api/collaboration/sessions - List active sessions
router.get('/sessions',
  authenticate,
  validatePagination,
  asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, sort = 'startedAt', order = 'desc' } = req.query;
    const { projectId, status, type } = req.query;
    const userId = req.user!._id.toString();

    // Build query - only show sessions user has access to
    const query: any = {
      isActive: true,
      $or: [
        { user: req.user!._id },
        { 'participants.user': req.user!._id },
      ],
    };

    // Optional filters
    if (projectId) {
      // Verify project access
      const project = await Project.findById(projectId);
      if (!project) {
        throw createError('Project not found', 404, 'PROJECT_NOT_FOUND');
      }

      const hasAccess = project.owner.toString() === userId ||
        project.collaborators.some(c => c.user.toString() === userId) ||
        project.visibility === 'public';

      if (!hasAccess) {
        throw createError('Access denied to project', 403, 'PROJECT_ACCESS_DENIED');
      }

      query.project = projectId;
    }

    if (status) {
      query.status = status;
    }

    if (type) {
      query.type = type;
    }

    // Check cache first
    const cacheKey = `collaboration:sessions:${userId}:${JSON.stringify({ query, page, limit, sort, order })}`;
    interface CachedSessionsResult {
      sessions: unknown[];
      pagination: Record<string, unknown>;
    }
    const cachedResult = await redisManager.get<CachedSessionsResult>(cacheKey);
    if (cachedResult) {
      res.json({
        success: true,
        data: cachedResult.sessions,
        pagination: cachedResult.pagination,
        cached: true,
      });
      return;
    }

    // Execute query
    const skip = (Number(page) - 1) * Number(limit);
    const sortObj: any = {};
    sortObj[sort as string] = order === 'asc' ? 1 : -1;

    const [sessions, total] = await Promise.all([
      Session.find(query)
        .populate('user', 'firstName lastName email')
        .populate('project', 'name visibility')
        .populate('participants.user', 'firstName lastName email')
        .sort(sortObj)
        .skip(skip)
        .limit(Number(limit)),
      Session.countDocuments(query),
    ]);

    const pagination = {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
      hasNext: Number(page) < Math.ceil(total / Number(limit)),
      hasPrev: Number(page) > 1,
    };

    // Cache result for 2 minutes
    await redisManager.set(cacheKey, { sessions, pagination }, 120);

    res.json({
      success: true,
      data: sessions,
      pagination,
    });
  })
);

// GET /api/collaboration/comments/:claimId - Get comment history for a claim
router.get('/comments/:claimId',
  authenticate,
  validate(validationSchemas.objectId, 'params'),
  validatePagination,
  asyncHandler(async (req: Request, res: Response) => {
    const { claimId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user!._id.toString();

    // Find claim and verify access
    const claim = await Claim.findOne({ _id: claimId, isActive: true })
      .populate('project', 'owner collaborators visibility settings')
      .populate('comments.user', 'firstName lastName email avatar')
      .populate('comments.replies.user', 'firstName lastName email avatar');

    if (!claim) {
      throw createError('Claim not found', 404, 'CLAIM_NOT_FOUND');
    }

    // Check project access
    const project = claim.project as any;
    const hasAccess = project.owner.toString() === userId ||
      project.collaborators.some((c: any) => c.user.toString() === userId) ||
      project.visibility === 'public';

    if (!hasAccess) {
      throw createError('Access denied to claim', 403, 'CLAIM_ACCESS_DENIED');
    }

    // Get comments with pagination (comments are embedded, so pagination is manual)
    const allComments = claim.comments || [];
    const total = allComments.length;
    const skip = (Number(page) - 1) * Number(limit);

    // Sort by timestamp (newest first) and paginate
    const sortedComments = [...allComments].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const paginatedComments = sortedComments.slice(skip, skip + Number(limit));

    const pagination = {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
      hasNext: Number(page) < Math.ceil(total / Number(limit)),
      hasPrev: Number(page) > 1,
    };

    res.json({
      success: true,
      data: paginatedComments,
      pagination,
      meta: {
        claimId,
        unresolvedCount: allComments.filter(c => !c.resolved).length,
      },
    });
  })
);

// POST /api/collaboration/comments - Add a comment (REST fallback)
router.post('/comments',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { claimId, text, parentCommentId } = req.body;
    const userId = req.user!._id.toString();

    // Validate required fields
    if (!claimId) {
      throw createError('Claim ID is required', 400, 'CLAIM_ID_REQUIRED');
    }

    if (!text || text.trim().length < 1) {
      throw createError('Comment text is required', 400, 'COMMENT_TEXT_REQUIRED');
    }

    if (text.length > 1000) {
      throw createError('Comment text cannot exceed 1000 characters', 400, 'COMMENT_TEXT_TOO_LONG');
    }

    // Find claim and verify access
    const claim = await Claim.findOne({ _id: claimId, isActive: true })
      .populate('project', 'owner collaborators visibility settings');

    if (!claim) {
      throw createError('Claim not found', 404, 'CLAIM_NOT_FOUND');
    }

    // Check project access and comment permissions
    const project = claim.project as any;
    const hasAccess = project.owner.toString() === userId ||
      project.collaborators.some((c: any) => c.user.toString() === userId) ||
      project.visibility === 'public';

    if (!hasAccess) {
      throw createError('Access denied to claim', 403, 'CLAIM_ACCESS_DENIED');
    }

    // Check if comments are allowed on this project
    if (!project.settings?.collaboration?.allowComments) {
      throw createError('Comments are not allowed on this project', 403, 'COMMENTS_DISABLED');
    }

    // If parentCommentId is provided, add as a reply
    if (parentCommentId) {
      const parentComment = claim.comments.find(
        (c: any) => c._id.toString() === parentCommentId
      );

      if (!parentComment) {
        throw createError('Parent comment not found', 404, 'PARENT_COMMENT_NOT_FOUND');
      }

      // Add reply to parent comment
      parentComment.replies.push({
        user: req.user!._id,
        text: text.trim(),
        timestamp: new Date(),
      });

      await claim.save();
      await claim.populate('comments.replies.user', 'firstName lastName email avatar');

      const updatedParentComment = claim.comments.find(
        (c: any) => c._id.toString() === parentCommentId
      );
      const newReply = updatedParentComment?.replies[updatedParentComment.replies.length - 1];

      logger.info(`Reply added to comment on claim ${claimId} by ${req.user!.email}`);

      res.status(201).json({
        success: true,
        message: 'Reply added successfully',
        data: newReply,
      });
      return;
    }

    // Add new top-level comment
    claim.comments.push({
      user: req.user!._id,
      text: text.trim(),
      timestamp: new Date(),
      resolved: false,
      replies: [],
    });

    await claim.save();
    await claim.populate('comments.user', 'firstName lastName email avatar');

    const newComment = claim.comments[claim.comments.length - 1];

    // Clear related caches
    await redisManager.deletePattern(`collaboration:comments:${claimId}:*`);

    // Track activity
    await redisManager.trackUserActivity(userId, {
      action: 'add_comment',
      claimId,
      details: { commentId: newComment._id?.toString() },
    });

    logger.info(`Comment added to claim ${claimId} by ${req.user!.email}`);

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: newComment,
    });
  })
);

// GET /api/collaboration/versions/:claimId - Get version history for a claim
router.get('/versions/:claimId',
  authenticate,
  validate(validationSchemas.objectId, 'params'),
  validatePagination,
  asyncHandler(async (req: Request, res: Response) => {
    const { claimId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user!._id.toString();

    // Find claim and verify access
    const claim = await Claim.findOne({ _id: claimId, isActive: true })
      .populate('project', 'owner collaborators visibility settings')
      .populate('versions.changedBy', 'firstName lastName email');

    if (!claim) {
      throw createError('Claim not found', 404, 'CLAIM_NOT_FOUND');
    }

    // Check project access
    const project = claim.project as any;
    const hasAccess = project.owner.toString() === userId ||
      project.collaborators.some((c: any) => c.user.toString() === userId) ||
      project.visibility === 'public';

    if (!hasAccess) {
      throw createError('Access denied to claim', 403, 'CLAIM_ACCESS_DENIED');
    }

    // Check if versioning is enabled
    if (!project.settings?.collaboration?.allowVersioning) {
      throw createError('Version history is not enabled on this project', 403, 'VERSIONING_DISABLED');
    }

    // Get versions with pagination
    const allVersions = claim.versions || [];
    const total = allVersions.length;
    const skip = (Number(page) - 1) * Number(limit);

    // Sort by version number (newest first) and paginate
    const sortedVersions = [...allVersions].sort((a, b) => b.versionNumber - a.versionNumber);
    const paginatedVersions = sortedVersions.slice(skip, skip + Number(limit));

    const pagination = {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
      hasNext: Number(page) < Math.ceil(total / Number(limit)),
      hasPrev: Number(page) > 1,
    };

    res.json({
      success: true,
      data: paginatedVersions,
      pagination,
      meta: {
        claimId,
        currentVersion: allVersions.length,
        currentText: claim.text,
      },
    });
  })
);

// POST /api/collaboration/versions/:claimId/revert - Revert to a specific version
router.post('/versions/:claimId/revert',
  authenticate,
  validate(validationSchemas.objectId, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { claimId } = req.params;
    const { versionNumber } = req.body;
    const userId = req.user!._id.toString();

    // Validate version number
    if (!versionNumber || typeof versionNumber !== 'number' || versionNumber < 1) {
      throw createError('Valid version number is required', 400, 'VERSION_NUMBER_REQUIRED');
    }

    // Find claim and verify access
    const claim = await Claim.findOne({ _id: claimId, isActive: true })
      .populate('project', 'owner collaborators visibility settings');

    if (!claim) {
      throw createError('Claim not found', 404, 'CLAIM_NOT_FOUND');
    }

    // Check project access and edit permissions
    const project = claim.project as any;
    const isOwner = project.owner.toString() === userId;
    const collaborator = project.collaborators.find(
      (c: any) => c.user.toString() === userId
    );
    const canEdit = isOwner || (collaborator && collaborator.permissions.canEdit);

    if (!canEdit) {
      throw createError('No permission to edit this claim', 403, 'EDIT_PERMISSION_DENIED');
    }

    // Check if versioning is enabled
    if (!project.settings?.collaboration?.allowVersioning) {
      throw createError('Version history is not enabled on this project', 403, 'VERSIONING_DISABLED');
    }

    // Find the target version
    const targetVersion = claim.versions.find(v => v.versionNumber === versionNumber);

    if (!targetVersion) {
      throw createError('Version not found', 404, 'VERSION_NOT_FOUND');
    }

    // Store current state as a new version before reverting
    const currentVersionNumber = claim.versions.length > 0
      ? Math.max(...claim.versions.map(v => v.versionNumber)) + 1
      : 1;

    claim.versions.push({
      versionNumber: currentVersionNumber,
      text: claim.text,
      changedBy: req.user!._id,
      changeReason: `Reverted to version ${versionNumber}`,
      timestamp: new Date(),
    });

    // Apply the target version's text
    claim.text = targetVersion.text;

    await claim.save();

    // Clear related caches
    await redisManager.deletePattern('claims:*');
    await redisManager.deletePattern(`collaboration:versions:${claimId}:*`);

    // Track activity
    await redisManager.trackUserActivity(userId, {
      action: 'revert_version',
      claimId,
      details: {
        fromVersion: currentVersionNumber - 1,
        toVersion: versionNumber,
      },
    });

    logger.info(`Claim ${claimId} reverted to version ${versionNumber} by ${req.user!.email}`);

    // Re-populate for response
    await claim.populate([
      { path: 'creator', select: 'firstName lastName email' },
      { path: 'project', select: 'name' },
      { path: 'versions.changedBy', select: 'firstName lastName email' },
    ]);

    res.json({
      success: true,
      message: `Successfully reverted to version ${versionNumber}`,
      data: {
        claim: {
          _id: claim._id,
          text: claim.text,
          currentVersion: claim.versions.length,
        },
        revertedFrom: currentVersionNumber - 1,
        revertedTo: versionNumber,
      },
    });
  })
);

export default router;
