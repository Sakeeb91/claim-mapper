import express from 'express';
import { Request, Response } from 'express';
import Session from '../models/Session';
import Project from '../models/Project';
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

export default router;
