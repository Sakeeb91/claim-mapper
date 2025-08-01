import express from 'express';
import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import Project from '../models/Project';
import User from '../models/User';
import Claim from '../models/Claim';
import Evidence from '../models/Evidence';
import { authenticate, requireRole } from '../middleware/auth';
import { validate, validationSchemas, sanitize, validatePagination, validateFile } from '../middleware/validation';
import { asyncHandler, createError } from '../middleware/errorHandler';
import redisManager from '../config/redis';
import { logger } from '../utils/logger';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'documents');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/html',
      'application/rtf'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// GET /api/projects - Get all projects for user
router.get('/',
  authenticate,
  validatePagination,
  asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, sort = 'updatedAt', order = 'desc' } = req.query;
    const { type, status, visibility, search } = req.query;
    const userId = req.user!._id;
    
    // Build query
    const query: any = {
      $or: [
        { owner: userId },
        { 'collaborators.user': userId },
      ],
      isActive: true,
    };
    
    // Add filters
    if (type) query.type = type;
    if (status) query.status = status;
    if (visibility) query.visibility = visibility;
    if (search) {
      query.$text = { $search: search as string };
    }
    
    // Check cache
    const cacheKey = `projects:user:${userId}:${JSON.stringify({ query, page, limit, sort, order })}`;
    const cachedResult = await redisManager.get(cacheKey);
    if (cachedResult) {
      res.json({
        success: true,
        data: cachedResult.projects,
        pagination: cachedResult.pagination,
        cached: true,
      });
      return;
    }
    
    // Execute query
    const skip = (Number(page) - 1) * Number(limit);
    const sortObj: any = {};
    sortObj[sort as string] = order === 'asc' ? 1 : -1;
    
    const [projects, total] = await Promise.all([
      Project.find(query)
        .populate('owner', 'firstName lastName email')
        .populate('collaborators.user', 'firstName lastName email')
        .sort(sortObj)
        .skip(skip)
        .limit(Number(limit)),
      Project.countDocuments(query)
    ]);
    
    const pagination = {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
      hasNext: Number(page) < Math.ceil(total / Number(limit)),
      hasPrev: Number(page) > 1,
    };
    
    // Cache for 5 minutes
    await redisManager.set(cacheKey, { projects, pagination }, 300);
    
    res.json({
      success: true,
      data: projects,
      pagination,
    });
  })
);

// POST /api/projects - Create new project
router.post('/',
  authenticate,
  sanitize,
  validate(validationSchemas.createProject),
  asyncHandler(async (req: Request, res: Response) => {
    const projectData = {
      ...req.body,
      owner: req.user!._id,
    };
    
    const project = new Project(projectData);
    await project.save();
    
    // Populate owner info
    await project.populate('owner', 'firstName lastName email');
    
    // Update user statistics
    await req.user!.updateOne({
      $inc: { 'stats.projectsCreated': 1 }
    });
    
    // Clear user's project cache
    await redisManager.deletePattern(`projects:user:${req.user!._id}:*`);
    
    // Track activity
    await redisManager.trackUserActivity(req.user!._id.toString(), {
      action: 'create_project',
      projectId: project._id,
    });
    
    logger.info(`Project created: ${project._id} by ${req.user!.email}`);
    
    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project,
    });
  })
);

// GET /api/projects/:id - Get specific project
router.get('/:id',
  authenticate,
  validate(validationSchemas.objectId, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!._id.toString();
    
    const project = await Project.findOne({ _id: id, isActive: true })
      .populate('owner', 'firstName lastName email')
      .populate('collaborators.user', 'firstName lastName email')
      .populate('collaborators.invitedBy', 'firstName lastName email');
    
    if (!project) {
      throw createError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }
    
    // Check access permissions
    const hasAccess = project.owner._id.toString() === userId ||
      project.collaborators.some(c => c.user._id.toString() === userId) ||
      project.visibility === 'public';
      
    if (!hasAccess) {
      throw createError('Access denied to project', 403, 'PROJECT_ACCESS_DENIED');
    }
    
    // Get project statistics
    const [claimsCount, evidenceCount, reasoningChainsCount] = await Promise.all([
      Claim.countDocuments({ project: id, isActive: true }),
      Evidence.countDocuments({ project: id, isActive: true }),
      // Add reasoning chains count when implemented
      0
    ]);
    
    // Update cached statistics
    project.statistics.totalClaims = claimsCount;
    project.statistics.totalEvidence = evidenceCount;
    project.statistics.totalReasoningChains = reasoningChainsCount;
    project.statistics.lastAnalyzed = new Date();
    
    await project.save();
    
    // Track view activity
    await redisManager.trackUserActivity(userId, {
      action: 'view_project',
      projectId: project._id,
    });
    
    res.json({
      success: true,
      data: project,
    });
  })
);

// PUT /api/projects/:id - Update project
router.put('/:id',
  authenticate,
  sanitize,
  validate(validationSchemas.objectId, 'params'),
  validate(validationSchemas.updateProject),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user!._id.toString();
    
    const project = await Project.findOne({ _id: id, isActive: true });
    
    if (!project) {
      throw createError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }
    
    // Check edit permissions
    const canEdit = project.owner.toString() === userId ||
      project.collaborators.some(c => 
        c.user.toString() === userId && c.permissions.canManageSettings
      );
      
    if (!canEdit) {
      throw createError('No permission to edit this project', 403, 'EDIT_PERMISSION_DENIED');
    }
    
    // Update project
    Object.assign(project, updates);
    await project.save();
    
    // Re-populate
    await project.populate([
      { path: 'owner', select: 'firstName lastName email' },
      { path: 'collaborators.user', select: 'firstName lastName email' }
    ]);
    
    // Clear caches
    await redisManager.deletePattern(`projects:*`);
    
    logger.info(`Project updated: ${project._id} by ${req.user!.email}`);
    
    res.json({
      success: true,
      message: 'Project updated successfully',
      data: project,
    });
  })
);

// DELETE /api/projects/:id - Delete project (soft delete)
router.delete('/:id',
  authenticate,
  validate(validationSchemas.objectId, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!._id.toString();
    
    const project = await Project.findOne({ _id: id, isActive: true });
    
    if (!project) {
      throw createError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }
    
    // Only owner can delete project
    if (project.owner.toString() !== userId) {
      throw createError('Only project owner can delete project', 403, 'DELETE_PERMISSION_DENIED');
    }
    
    // Soft delete project and related data
    await Promise.all([
      project.updateOne({ isActive: false, status: 'archived' }),
      Claim.updateMany({ project: id }, { isActive: false, status: 'archived' }),
      Evidence.updateMany({ project: id }, { isActive: false }),
    ]);
    
    // Clear caches
    await redisManager.deletePattern(`projects:*`);
    await redisManager.deletePattern(`claims:*`);
    
    logger.info(`Project deleted: ${project._id} by ${req.user!.email}`);
    
    res.json({
      success: true,
      message: 'Project deleted successfully',
    });
  })
);

// POST /api/projects/:id/collaborators - Invite collaborator
router.post('/:id/collaborators',
  authenticate,
  sanitize,
  validate(validationSchemas.objectId, 'params'),
  validate(validationSchemas.inviteCollaborator),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { email, role, message } = req.body;
    const userId = req.user!._id.toString();
    
    const project = await Project.findOne({ _id: id, isActive: true });
    
    if (!project) {
      throw createError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }
    
    // Check invite permissions
    const canInvite = project.owner.toString() === userId ||
      project.collaborators.some(c => 
        c.user.toString() === userId && c.permissions.canInvite
      );
      
    if (!canInvite) {
      throw createError('No permission to invite collaborators', 403, 'INVITE_PERMISSION_DENIED');
    }
    
    // Find user to invite
    const userToInvite = await User.findOne({ 
      email: email.toLowerCase(),
      isActive: true 
    });
    
    if (!userToInvite) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }
    
    // Check if already collaborator
    const isOwner = project.owner.toString() === userToInvite._id.toString();
    const isCollaborator = project.collaborators.some(c => 
      c.user.toString() === userToInvite._id.toString()
    );
    
    if (isOwner) {
      throw createError('User is already the project owner', 400, 'ALREADY_OWNER');
    }
    
    if (isCollaborator) {
      throw createError('User is already a collaborator', 400, 'ALREADY_COLLABORATOR');
    }
    
    // Add collaborator
    await project.addCollaborator(userToInvite._id.toString(), role, userId);
    
    // Re-populate
    await project.populate('collaborators.user', 'firstName lastName email');
    
    // TODO: Send invitation email
    // await sendInvitationEmail(userToInvite.email, project.name, message);
    
    logger.info(`Collaborator invited: ${userToInvite.email} to project ${project._id}`);
    
    res.status(201).json({
      success: true,
      message: 'Collaborator invited successfully',
      data: {
        collaborator: project.collaborators[project.collaborators.length - 1],
      },
    });
  })
);

// PUT /api/projects/:id/collaborators/:userId - Update collaborator role
router.put('/:id/collaborators/:userId',
  authenticate,
  validate(validationSchemas.objectId, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id, userId: collaboratorId } = req.params;
    const { role } = req.body;
    const userId = req.user!._id.toString();
    
    if (!['viewer', 'editor', 'admin'].includes(role)) {
      throw createError('Invalid role', 400, 'INVALID_ROLE');
    }
    
    const project = await Project.findOne({ _id: id, isActive: true });
    
    if (!project) {
      throw createError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }
    
    // Only owner can change roles
    if (project.owner.toString() !== userId) {
      throw createError('Only project owner can change collaborator roles', 403, 'ROLE_CHANGE_PERMISSION_DENIED');
    }
    
    // Find collaborator
    const collaborator = project.collaborators.find(c => 
      c.user.toString() === collaboratorId
    );
    
    if (!collaborator) {
      throw createError('Collaborator not found', 404, 'COLLABORATOR_NOT_FOUND');
    }
    
    // Update role and permissions
    collaborator.role = role;
    collaborator.permissions = {
      canEdit: role === 'editor' || role === 'admin',
      canDelete: role === 'admin',
      canInvite: role === 'admin',
      canExport: true,
      canManageSettings: role === 'admin',
    };
    
    await project.save();
    
    res.json({
      success: true,
      message: 'Collaborator role updated successfully',
      data: { collaborator },
    });
  })
);

// DELETE /api/projects/:id/collaborators/:userId - Remove collaborator
router.delete('/:id/collaborators/:userId',
  authenticate,
  validate(validationSchemas.objectId, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id, userId: collaboratorId } = req.params;
    const userId = req.user!._id.toString();
    
    const project = await Project.findOne({ _id: id, isActive: true });
    
    if (!project) {
      throw createError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }
    
    // Owner can remove anyone, collaborators can remove themselves
    const canRemove = project.owner.toString() === userId ||
      collaboratorId === userId;
      
    if (!canRemove) {
      throw createError('No permission to remove this collaborator', 403, 'REMOVE_PERMISSION_DENIED');
    }
    
    // Remove collaborator
    await project.removeCollaborator(collaboratorId);
    
    res.json({
      success: true,
      message: 'Collaborator removed successfully',
    });
  })
);

// POST /api/projects/:id/documents - Upload document
router.post('/:id/documents',
  authenticate,
  validate(validationSchemas.objectId, 'params'),
  upload.single('document'),
  validateFile({
    required: true,
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/html',
      'application/rtf'
    ],
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const file = req.file!;
    const userId = req.user!._id.toString();
    
    const project = await Project.findOne({ _id: id, isActive: true });
    
    if (!project) {
      throw createError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }
    
    // Check upload permissions
    const canUpload = project.owner.toString() === userId ||
      project.collaborators.some(c => 
        c.user.toString() === userId && c.permissions.canEdit
      );
      
    if (!canUpload) {
      throw createError('No permission to upload documents', 403, 'UPLOAD_PERMISSION_DENIED');
    }
    
    // Add document to project
    const document = {
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      uploadedBy: req.user!._id,
      uploadedAt: new Date(),
      processed: false,
      extractedClaims: 0,
      metadata: {
        encoding: file.encoding,
      },
    };
    
    project.documents.push(document);
    await project.save();
    
    // TODO: Queue document for processing
    // await queueDocumentProcessing(project._id.toString(), document);
    
    logger.info(`Document uploaded: ${file.originalname} to project ${project._id}`);
    
    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: { document },
    });
  })
);

// GET /api/projects/:id/analytics - Get project analytics
router.get('/:id/analytics',
  authenticate,
  validate(validationSchemas.objectId, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!._id.toString();
    
    const project = await Project.findOne({ _id: id, isActive: true });
    
    if (!project) {
      throw createError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }
    
    // Check access permissions
    const hasAccess = project.owner.toString() === userId ||
      project.collaborators.some(c => c.user.toString() === userId);
      
    if (!hasAccess) {
      throw createError('Access denied to project', 403, 'PROJECT_ACCESS_DENIED');
    }
    
    // Check cache
    const cacheKey = `analytics:project:${id}`;
    const cachedAnalytics = await redisManager.get(cacheKey);
    if (cachedAnalytics) {
      res.json({
        success: true,
        data: cachedAnalytics,
        cached: true,
      });
      return;
    }
    
    // Get analytics data
    const [claimsStats, evidenceStats, qualityStats] = await Promise.all([
      Claim.aggregate([
        { $match: { project: project._id, isActive: true } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            byType: {
              $push: {
                type: '$type',
                confidence: '$confidence',
                status: '$status'
              }
            },
            avgConfidence: { $avg: '$confidence' },
            avgQuality: { $avg: '$quality.overallScore' }
          }
        }
      ]),
      
      Evidence.aggregate([
        { $match: { project: project._id, isActive: true } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            byType: {
              $push: {
                type: '$type',
                reliability: '$reliability.score'
              }
            },
            avgReliability: { $avg: '$reliability.score' }
          }
        }
      ]),
      
      Claim.aggregate([
        { $match: { project: project._id, isActive: true } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ])
    ]);
    
    const analytics = {
      claims: claimsStats[0] || { total: 0, avgConfidence: 0, avgQuality: 0 },
      evidence: evidenceStats[0] || { total: 0, avgReliability: 0 },
      statusDistribution: qualityStats.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      lastUpdated: new Date(),
    };
    
    // Cache for 10 minutes
    await redisManager.set(cacheKey, analytics, 600);
    
    res.json({
      success: true,
      data: analytics,
    });
  })
);

// GET /api/projects/public - Get public projects
router.get('/public',
  asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, sort = 'updatedAt', order = 'desc' } = req.query;
    const { type, search } = req.query;
    
    // Build query
    const query: any = {
      visibility: 'public',
      isActive: true,
      status: { $in: ['active', 'completed'] }
    };
    
    if (type) query.type = type;
    if (search) {
      query.$text = { $search: search as string };
    }
    
    // Execute query
    const skip = (Number(page) - 1) * Number(limit);
    const sortObj: any = {};
    sortObj[sort as string] = order === 'asc' ? 1 : -1;
    
    const [projects, total] = await Promise.all([
      Project.find(query)
        .populate('owner', 'firstName lastName')
        .select('-collaborators -settings -integration') // Hide sensitive info
        .sort(sortObj)
        .skip(skip)
        .limit(Number(limit)),
      Project.countDocuments(query)
    ]);
    
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
      data: projects,
      pagination,
    });
  })
);

export default router;