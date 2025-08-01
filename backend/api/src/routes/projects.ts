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
    const cacheKey = `projects:user:${userId}:${JSON.stringify({ query, page, limit, sort, order })}`;\n    const cachedResult = await redisManager.get(cacheKey);
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
    ]);\n    
    // Clear caches\n    await redisManager.deletePattern(`projects:*`);\n    await redisManager.deletePattern(`claims:*`);\n    \n    logger.info(`Project deleted: ${project._id} by ${req.user!.email}`);\n    \n    res.json({\n      success: true,\n      message: 'Project deleted successfully',\n    });\n  })\n);\n\n// POST /api/projects/:id/collaborators - Invite collaborator\nrouter.post('/:id/collaborators',\n  authenticate,\n  sanitize,\n  validate(validationSchemas.objectId, 'params'),\n  validate(validationSchemas.inviteCollaborator),\n  asyncHandler(async (req: Request, res: Response) => {\n    const { id } = req.params;\n    const { email, role, message } = req.body;\n    const userId = req.user!._id.toString();\n    \n    const project = await Project.findOne({ _id: id, isActive: true });\n    \n    if (!project) {\n      throw createError('Project not found', 404, 'PROJECT_NOT_FOUND');\n    }\n    \n    // Check invite permissions\n    const canInvite = project.owner.toString() === userId ||\n      project.collaborators.some(c => \n        c.user.toString() === userId && c.permissions.canInvite\n      );\n      \n    if (!canInvite) {\n      throw createError('No permission to invite collaborators', 403, 'INVITE_PERMISSION_DENIED');\n    }\n    \n    // Find user to invite\n    const userToInvite = await User.findOne({ \n      email: email.toLowerCase(),\n      isActive: true \n    });\n    \n    if (!userToInvite) {\n      throw createError('User not found', 404, 'USER_NOT_FOUND');\n    }\n    \n    // Check if already collaborator\n    const isOwner = project.owner.toString() === userToInvite._id.toString();\n    const isCollaborator = project.collaborators.some(c => \n      c.user.toString() === userToInvite._id.toString()\n    );\n    \n    if (isOwner) {\n      throw createError('User is already the project owner', 400, 'ALREADY_OWNER');\n    }\n    \n    if (isCollaborator) {\n      throw createError('User is already a collaborator', 400, 'ALREADY_COLLABORATOR');\n    }\n    \n    // Add collaborator\n    await project.addCollaborator(userToInvite._id.toString(), role, userId);\n    \n    // Re-populate\n    await project.populate('collaborators.user', 'firstName lastName email');\n    \n    // TODO: Send invitation email\n    // await sendInvitationEmail(userToInvite.email, project.name, message);\n    \n    logger.info(`Collaborator invited: ${userToInvite.email} to project ${project._id}`);\n    \n    res.status(201).json({\n      success: true,\n      message: 'Collaborator invited successfully',\n      data: {\n        collaborator: project.collaborators[project.collaborators.length - 1],\n      },\n    });\n  })\n);\n\n// PUT /api/projects/:id/collaborators/:userId - Update collaborator role\nrouter.put('/:id/collaborators/:userId',\n  authenticate,\n  validate(validationSchemas.objectId, 'params'),\n  asyncHandler(async (req: Request, res: Response) => {\n    const { id, userId: collaboratorId } = req.params;\n    const { role } = req.body;\n    const userId = req.user!._id.toString();\n    \n    if (!['viewer', 'editor', 'admin'].includes(role)) {\n      throw createError('Invalid role', 400, 'INVALID_ROLE');\n    }\n    \n    const project = await Project.findOne({ _id: id, isActive: true });\n    \n    if (!project) {\n      throw createError('Project not found', 404, 'PROJECT_NOT_FOUND');\n    }\n    \n    // Only owner can change roles\n    if (project.owner.toString() !== userId) {\n      throw createError('Only project owner can change collaborator roles', 403, 'ROLE_CHANGE_PERMISSION_DENIED');\n    }\n    \n    // Find collaborator\n    const collaborator = project.collaborators.find(c => \n      c.user.toString() === collaboratorId\n    );\n    \n    if (!collaborator) {\n      throw createError('Collaborator not found', 404, 'COLLABORATOR_NOT_FOUND');\n    }\n    \n    // Update role and permissions\n    collaborator.role = role;\n    collaborator.permissions = {\n      canEdit: role === 'editor' || role === 'admin',\n      canDelete: role === 'admin',\n      canInvite: role === 'admin',\n      canExport: true,\n      canManageSettings: role === 'admin',\n    };\n    \n    await project.save();\n    \n    res.json({\n      success: true,\n      message: 'Collaborator role updated successfully',\n      data: { collaborator },\n    });\n  })\n);\n\n// DELETE /api/projects/:id/collaborators/:userId - Remove collaborator\nrouter.delete('/:id/collaborators/:userId',\n  authenticate,\n  validate(validationSchemas.objectId, 'params'),\n  asyncHandler(async (req: Request, res: Response) => {\n    const { id, userId: collaboratorId } = req.params;\n    const userId = req.user!._id.toString();\n    \n    const project = await Project.findOne({ _id: id, isActive: true });\n    \n    if (!project) {\n      throw createError('Project not found', 404, 'PROJECT_NOT_FOUND');\n    }\n    \n    // Owner can remove anyone, collaborators can remove themselves\n    const canRemove = project.owner.toString() === userId ||\n      collaboratorId === userId;\n      \n    if (!canRemove) {\n      throw createError('No permission to remove this collaborator', 403, 'REMOVE_PERMISSION_DENIED');\n    }\n    \n    // Remove collaborator\n    await project.removeCollaborator(collaboratorId);\n    \n    res.json({\n      success: true,\n      message: 'Collaborator removed successfully',\n    });\n  })\n);\n\n// POST /api/projects/:id/documents - Upload document\nrouter.post('/:id/documents',\n  authenticate,\n  validate(validationSchemas.objectId, 'params'),\n  upload.single('document'),\n  validateFile({\n    required: true,\n    maxSize: 50 * 1024 * 1024, // 50MB\n    allowedTypes: [\n      'application/pdf',\n      'application/msword',\n      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',\n      'text/plain',\n      'text/html',\n      'application/rtf'\n    ],\n  }),\n  asyncHandler(async (req: Request, res: Response) => {\n    const { id } = req.params;\n    const file = req.file!;\n    const userId = req.user!._id.toString();\n    \n    const project = await Project.findOne({ _id: id, isActive: true });\n    \n    if (!project) {\n      throw createError('Project not found', 404, 'PROJECT_NOT_FOUND');\n    }\n    \n    // Check upload permissions\n    const canUpload = project.owner.toString() === userId ||\n      project.collaborators.some(c => \n        c.user.toString() === userId && c.permissions.canEdit\n      );\n      \n    if (!canUpload) {\n      throw createError('No permission to upload documents', 403, 'UPLOAD_PERMISSION_DENIED');\n    }\n    \n    // Add document to project\n    const document = {\n      filename: file.filename,\n      originalName: file.originalname,\n      mimetype: file.mimetype,\n      size: file.size,\n      path: file.path,\n      uploadedBy: req.user!._id,\n      uploadedAt: new Date(),\n      processed: false,\n      extractedClaims: 0,\n      metadata: {\n        encoding: file.encoding,\n      },\n    };\n    \n    project.documents.push(document);\n    await project.save();\n    \n    // TODO: Queue document for processing\n    // await queueDocumentProcessing(project._id.toString(), document);\n    \n    logger.info(`Document uploaded: ${file.originalname} to project ${project._id}`);\n    \n    res.status(201).json({\n      success: true,\n      message: 'Document uploaded successfully',\n      data: { document },\n    });\n  })\n);\n\n// GET /api/projects/:id/analytics - Get project analytics\nrouter.get('/:id/analytics',\n  authenticate,\n  validate(validationSchemas.objectId, 'params'),\n  asyncHandler(async (req: Request, res: Response) => {\n    const { id } = req.params;\n    const userId = req.user!._id.toString();\n    \n    const project = await Project.findOne({ _id: id, isActive: true });\n    \n    if (!project) {\n      throw createError('Project not found', 404, 'PROJECT_NOT_FOUND');\n    }\n    \n    // Check access permissions\n    const hasAccess = project.owner.toString() === userId ||\n      project.collaborators.some(c => c.user.toString() === userId);\n      \n    if (!hasAccess) {\n      throw createError('Access denied to project', 403, 'PROJECT_ACCESS_DENIED');\n    }\n    \n    // Check cache\n    const cacheKey = `analytics:project:${id}`;\n    const cachedAnalytics = await redisManager.get(cacheKey);\n    if (cachedAnalytics) {\n      res.json({\n        success: true,\n        data: cachedAnalytics,\n        cached: true,\n      });\n      return;\n    }\n    \n    // Get analytics data\n    const [claimsStats, evidenceStats, qualityStats] = await Promise.all([\n      Claim.aggregate([\n        { $match: { project: project._id, isActive: true } },\n        {\n          $group: {\n            _id: null,\n            total: { $sum: 1 },\n            byType: {\n              $push: {\n                type: '$type',\n                confidence: '$confidence',\n                status: '$status'\n              }\n            },\n            avgConfidence: { $avg: '$confidence' },\n            avgQuality: { $avg: '$quality.overallScore' }\n          }\n        }\n      ]),\n      \n      Evidence.aggregate([\n        { $match: { project: project._id, isActive: true } },\n        {\n          $group: {\n            _id: null,\n            total: { $sum: 1 },\n            byType: {\n              $push: {\n                type: '$type',\n                reliability: '$reliability.score'\n              }\n            },\n            avgReliability: { $avg: '$reliability.score' }\n          }\n        }\n      ]),\n      \n      Claim.aggregate([\n        { $match: { project: project._id, isActive: true } },\n        {\n          $group: {\n            _id: '$status',\n            count: { $sum: 1 }\n          }\n        }\n      ])\n    ]);\n    \n    const analytics = {\n      claims: claimsStats[0] || { total: 0, avgConfidence: 0, avgQuality: 0 },\n      evidence: evidenceStats[0] || { total: 0, avgReliability: 0 },\n      statusDistribution: qualityStats.reduce((acc: any, item: any) => {\n        acc[item._id] = item.count;\n        return acc;\n      }, {}),\n      lastUpdated: new Date(),\n    };\n    \n    // Cache for 10 minutes\n    await redisManager.set(cacheKey, analytics, 600);\n    \n    res.json({\n      success: true,\n      data: analytics,\n    });\n  })\n);\n\n// GET /api/projects/public - Get public projects\nrouter.get('/public',\n  asyncHandler(async (req: Request, res: Response) => {\n    const { page = 1, limit = 20, sort = 'updatedAt', order = 'desc' } = req.query;\n    const { type, search } = req.query;\n    \n    // Build query\n    const query: any = {\n      visibility: 'public',\n      isActive: true,\n      status: { $in: ['active', 'completed'] }\n    };\n    \n    if (type) query.type = type;\n    if (search) {\n      query.$text = { $search: search as string };\n    }\n    \n    // Execute query\n    const skip = (Number(page) - 1) * Number(limit);\n    const sortObj: any = {};\n    sortObj[sort as string] = order === 'asc' ? 1 : -1;\n    \n    const [projects, total] = await Promise.all([\n      Project.find(query)\n        .populate('owner', 'firstName lastName')\n        .select('-collaborators -settings -integration') // Hide sensitive info\n        .sort(sortObj)\n        .skip(skip)\n        .limit(Number(limit)),\n      Project.countDocuments(query)\n    ]);\n    \n    const pagination = {\n      page: Number(page),\n      limit: Number(limit),\n      total,\n      totalPages: Math.ceil(total / Number(limit)),\n      hasNext: Number(page) < Math.ceil(total / Number(limit)),\n      hasPrev: Number(page) > 1,\n    };\n    \n    res.json({\n      success: true,\n      data: projects,\n      pagination,\n    });\n  })\n);\n\nexport default router;