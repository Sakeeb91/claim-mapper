/**
 * Reasoning API Routes
 *
 * This module provides a complete RESTful API for managing reasoning chains in the
 * Claim Mapper system. Reasoning chains represent logical connections between claims
 * and evidence, including deductive, inductive, abductive, and other reasoning types.
 *
 * The module integrates with the ML service (port 8002) for advanced reasoning analysis
 * including fallacy detection, gap identification, and reasoning chain generation.
 *
 * @module routes/reasoning
 *
 * Endpoints:
 * - GET    /api/reasoning              - List reasoning chains with filtering
 * - GET    /api/reasoning/search       - Full-text search
 * - GET    /api/reasoning/claim/:id    - Get reasoning chains for a claim
 * - GET    /api/reasoning/project/:id/stats - Project reasoning statistics
 * - GET    /api/reasoning/:id          - Get single reasoning chain
 * - POST   /api/reasoning              - Create reasoning chain manually
 * - POST   /api/reasoning/generate     - Generate reasoning chain with ML
 * - POST   /api/reasoning/:id/validate - Validate reasoning with ML
 * - POST   /api/reasoning/:id/fallacies - Detect fallacies with ML
 * - POST   /api/reasoning/:id/strengthen - Get improvement suggestions
 * - POST   /api/reasoning/:id/review   - Add review to reasoning chain
 * - PUT    /api/reasoning/:id          - Update reasoning chain
 * - DELETE /api/reasoning/:id          - Soft delete reasoning chain
 */

import express from 'express';
import { Request, Response } from 'express';
import axios, { AxiosError } from 'axios';
import mongoose from 'mongoose';
import ReasoningChain from '../models/ReasoningChain';
import Claim from '../models/Claim';
import Evidence from '../models/Evidence';
import Project from '../models/Project';
import { authenticate } from '../middleware/auth';
import { validate, validationSchemas, sanitize, validatePagination } from '../middleware/validation';
import { asyncHandler, createError } from '../middleware/errorHandler';
import redisManager from '../config/redis';
import { logger } from '../utils/logger';
import {
  VALIDATION_LIMITS,
  REASONING_ERROR_MESSAGES,
  REASONING_TYPES,
  REASONING_STATUSES,
} from '../constants/validation';
import { linkPremiseToEvidence, LinkedEvidence } from '../services/linking';

const router = express.Router();

/**
 * ML Service configuration
 */
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8002';
const ML_SERVICE_TIMEOUT = VALIDATION_LIMITS.REASONING_ML_TIMEOUT;

/**
 * Helper function to call ML service with error handling
 */
async function callMLService<T>(
  endpoint: string,
  data: any,
  method: 'get' | 'post' = 'post'
): Promise<T> {
  try {
    const response = await axios({
      method,
      url: `${ML_SERVICE_URL}${endpoint}`,
      data: method === 'post' ? data : undefined,
      params: method === 'get' ? data : undefined,
      timeout: ML_SERVICE_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.ML_SERVICE_API_KEY || '',
      },
    });
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw createError(
          REASONING_ERROR_MESSAGES.ML_SERVICE_UNAVAILABLE,
          503,
          'ML_SERVICE_UNAVAILABLE'
        );
      }
      if (error.response?.status === 429) {
        throw createError(
          REASONING_ERROR_MESSAGES.ML_RATE_LIMITED,
          429,
          'ML_RATE_LIMITED'
        );
      }
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        throw createError(
          'ML service request timed out',
          504,
          'ML_TIMEOUT'
        );
      }
      throw createError(
        REASONING_ERROR_MESSAGES.ML_REQUEST_FAILED,
        error.response?.status || 502,
        'ML_REQUEST_FAILED',
        { mlError: error.response?.data }
      );
    }
    throw error;
  }
}

/**
 * Check if user has access to a project
 */
async function checkProjectAccess(projectId: string, userId?: string): Promise<boolean> {
  const project = await Project.findById(projectId);
  if (!project || !project.isActive) {
    return false;
  }

  if (project.visibility === 'public') {
    return true;
  }

  if (!userId) {
    return false;
  }

  const isOwner = project.owner.toString() === userId;
  const isCollaborator = project.collaborators.some(
    (c: any) => c.user.toString() === userId
  );

  return isOwner || isCollaborator;
}

/**
 * Check if user can edit reasoning chain in a project
 */
async function checkEditPermission(
  projectId: string,
  userId: string,
  creatorId?: string
): Promise<boolean> {
  const project = await Project.findById(projectId);
  if (!project || !project.isActive) {
    return false;
  }

  if (project.owner.toString() === userId) {
    return true;
  }

  if (creatorId && creatorId === userId) {
    return true;
  }

  const collaborator = project.collaborators.find(
    (c: any) => c.user.toString() === userId
  );

  return collaborator?.permissions?.canEdit === true;
}

// ============================================================================
// SPECIFIC ROUTES (must come before parameterized routes)
// ============================================================================

/**
 * POST /api/reasoning/generate - Generate reasoning chain using ML service
 *
 * This endpoint uses the ML service to generate a complete reasoning chain
 * for a given claim. It leverages LLM capabilities for advanced reasoning.
 *
 * Body:
 * - claimId: ID of the claim to generate reasoning for (required)
 * - reasoningType: Type of reasoning (deductive, inductive, etc.) (required)
 * - premises: Optional array of premise statements
 * - conclusion: Optional conclusion statement
 * - complexity: simple | intermediate | complex | advanced
 * - maxSteps: Maximum number of reasoning steps (2-20)
 * - useLLM: Whether to use LLM for generation (default true)
 * - llmProvider: openai | anthropic (default openai)
 */
router.post('/generate',
  authenticate,
  sanitize,
  validate(validationSchemas.generateReasoningChain),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      claimId,
      reasoningType,
      premises,
      conclusion,
      complexity = 'intermediate',
      maxSteps = 10,
      useLLM = true,
      llmProvider = 'openai',
    } = req.body;

    // Find and validate claim
    const claim = await Claim.findOne({ _id: claimId, isActive: true })
      .populate('project', 'owner collaborators visibility settings');

    if (!claim) {
      throw createError(REASONING_ERROR_MESSAGES.CLAIM_NOT_FOUND, 404, 'CLAIM_NOT_FOUND');
    }

    // Check project access
    const project = claim.project as any;
    const userId = req.user!._id.toString();
    const hasAccess = project.visibility === 'public' ||
      project.owner.toString() === userId ||
      project.collaborators.some((c: any) => c.user.toString() === userId);

    if (!hasAccess) {
      throw createError(REASONING_ERROR_MESSAGES.ACCESS_DENIED, 403, 'ACCESS_DENIED');
    }

    // Get related evidence for context
    const evidence = await Evidence.find({
      claims: claimId,
      isActive: true,
    }).select('text type reliability.score').limit(10);

    const evidenceTexts = evidence.map((e) => e.text);

    // Check cache for similar request
    const cacheKey = `reasoning:generate:${claimId}:${reasoningType}:${complexity}`;
    const cachedResult = await redisManager.get(cacheKey);
    if (cachedResult) {
      logger.debug('Reasoning generation served from cache', { cacheKey });
      return res.json({
        success: true,
        data: cachedResult,
        cached: true,
      });
    }

    // Call ML service to generate reasoning
    const mlResponse = await callMLService<any>('/reasoning/generate', {
      claim: claim.text,
      evidence: evidenceTexts,
      reasoning_type: reasoningType,
      complexity,
      max_steps: maxSteps,
      use_llm: useLLM,
      llm_provider: llmProvider,
      premises: premises || [],
      conclusion: conclusion || '',
    });

    // Transform ML response to our schema format
    const reasoningSteps = (mlResponse.reasoning_chains?.[0]?.steps || []).map(
      (step: any, index: number) => ({
        stepNumber: step.step_number || index + 1,
        text: step.text,
        type: step.type || 'inference',
        confidence: step.confidence || 0.8,
        evidence: [],
        metadata: {
          generatedBy: 'ai',
          sourceModel: llmProvider,
          timestamp: new Date(),
        },
      })
    );

    // Create reasoning chain in database
    const reasoningChain = new ReasoningChain({
      claim: claimId,
      type: reasoningType,
      steps: reasoningSteps.length >= 2 ? reasoningSteps : [
        {
          stepNumber: 1,
          text: premises?.[0] || `Premise: ${claim.text}`,
          type: 'premise',
          confidence: 0.8,
          evidence: [],
          metadata: { generatedBy: 'ai', sourceModel: llmProvider, timestamp: new Date() },
        },
        {
          stepNumber: 2,
          text: conclusion || `Conclusion based on ${reasoningType} reasoning`,
          type: 'conclusion',
          confidence: 0.7,
          evidence: [],
          metadata: { generatedBy: 'ai', sourceModel: llmProvider, timestamp: new Date() },
        },
      ],
      validity: {
        logicalValidity: mlResponse.reasoning_chains?.[0]?.logical_validity || 0.7,
        soundness: mlResponse.reasoning_chains?.[0]?.overall_confidence || 0.7,
        completeness: 0.7,
        coherence: 0.7,
      },
      analysis: {
        fallacies: mlResponse.fallacies || [],
        gaps: mlResponse.logical_gaps || [],
        strengths: [],
        counterarguments: [],
      },
      project: project._id,
      creator: req.user!._id,
      metadata: {
        generationMethod: 'ai_assisted',
        aiModel: llmProvider,
        processingTime: mlResponse.processing_time,
        complexity,
        language: 'en',
        wordCount: 0,
      },
      status: 'draft',
    });

    await reasoningChain.save();

    // Auto-link evidence to premise steps using semantic linking pipeline
    let linkingStats = { linked: 0, premises: 0 };
    try {
      for (let i = 0; i < reasoningChain.steps.length; i++) {
        const step = reasoningChain.steps[i];
        if (step.type === 'premise') {
          linkingStats.premises++;
          const linkingResult = await linkPremiseToEvidence(
            step.text,
            project._id.toString(),
            { rerankK: 3, minScore: 0.4 }
          );

          if (linkingResult.linkedEvidence.length > 0) {
            // Store linked evidence in step metadata
            reasoningChain.steps[i].metadata.linkedEvidence = linkingResult.linkedEvidence.map((e) => ({
              evidenceId: e.evidenceId,
              evidenceText: e.evidenceText,
              relationship: e.relationship,
              confidence: e.confidence,
              vectorScore: e.vectorScore,
              rerankScore: e.rerankScore,
              sourceUrl: e.sourceUrl,
            }));

            // Also add supporting evidence IDs to the step's evidence array
            const supportingIds = linkingResult.linkedEvidence
              .filter((e) => e.relationship === 'supports' || e.relationship === 'partial_support')
              .map((e) => new mongoose.Types.ObjectId(e.evidenceId));

            reasoningChain.steps[i].evidence = [
              ...reasoningChain.steps[i].evidence,
              ...supportingIds,
            ];
            linkingStats.linked++;
          }
        }
      }

      // Save the chain again with linked evidence
      if (linkingStats.linked > 0) {
        await reasoningChain.save();
        logger.info('Auto-linked evidence to reasoning chain', {
          chainId: reasoningChain._id,
          premisesLinked: linkingStats.linked,
          totalPremises: linkingStats.premises,
        });
      }
    } catch (linkError) {
      // Log but don't fail the request if linking fails
      logger.warn('Evidence auto-linking failed, continuing without links', {
        chainId: reasoningChain._id,
        error: linkError instanceof Error ? linkError.message : 'Unknown error',
      });
    }

    // Populate for response
    await reasoningChain.populate([
      { path: 'claim', select: 'text type confidence' },
      { path: 'creator', select: 'firstName lastName email' },
      { path: 'project', select: 'name' },
    ]);

    // Cache the result
    await redisManager.set(cacheKey, reasoningChain, VALIDATION_LIMITS.REASONING_CACHE_TTL);

    // Clear related caches
    await redisManager.deletePattern(`reasoning:list:*`);
    await redisManager.deletePattern(`reasoning:claim:${claimId}:*`);

    // Track activity
    await redisManager.trackUserActivity(userId, {
      action: 'generate_reasoning',
      reasoningChainId: reasoningChain._id,
      claimId,
      reasoningType,
    });

    logger.info(`Reasoning chain generated: ${reasoningChain._id} by ${req.user!.email}`, {
      claimId,
      reasoningType,
      stepCount: reasoningChain.steps.length,
    });

    res.status(201).json({
      success: true,
      message: 'Reasoning chain generated successfully',
      data: reasoningChain,
      mlAnalysis: {
        fallacies: mlResponse.fallacies,
        gaps: mlResponse.logical_gaps,
        confidence: mlResponse.reasoning_chains?.[0]?.overall_confidence,
      },
      linkingStats: {
        premisesProcessed: linkingStats.premises,
        premisesLinked: linkingStats.linked,
      },
    });
  })
);

/**
 * GET /api/reasoning/project/:projectId/stats - Get reasoning statistics for a project
 */
router.get('/project/:projectId/stats',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;

    if (!/^[0-9a-fA-F]{24}$/.test(projectId)) {
      throw createError('Invalid project ID format', 400, 'INVALID_PROJECT_ID');
    }

    const hasAccess = await checkProjectAccess(projectId, req.user!._id.toString());
    if (!hasAccess) {
      throw createError(REASONING_ERROR_MESSAGES.ACCESS_DENIED, 403, 'PROJECT_ACCESS_DENIED');
    }

    // Check cache
    const cacheKey = `reasoning:stats:${projectId}`;
    const cachedResult = await redisManager.get(cacheKey);
    if (cachedResult) {
      return res.json({
        success: true,
        data: cachedResult,
        cached: true,
      });
    }

    // Aggregate statistics
    const projectObjectId = new mongoose.Types.ObjectId(projectId);
    const stats = await ReasoningChain.aggregate([
      { $match: { project: projectObjectId, isActive: true } },
      {
        $group: {
          _id: null,
          totalChains: { $sum: 1 },
          avgValidity: { $avg: '$validity.overallScore' },
          avgQuality: { $avg: '$quality.overallQuality' },
          avgStepCount: { $avg: { $size: '$steps' } },
          draft: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
          review: { $sum: { $cond: [{ $eq: ['$status', 'review'] }, 1, 0] } },
          validated: { $sum: { $cond: [{ $eq: ['$status', 'validated'] }, 1, 0] } },
          published: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } },
          archived: { $sum: { $cond: [{ $eq: ['$status', 'archived'] }, 1, 0] } },
          totalFallacies: { $sum: { $size: '$analysis.fallacies' } },
          totalGaps: { $sum: { $size: '$analysis.gaps' } },
        },
      },
    ]);

    const typeStats = await ReasoningChain.aggregate([
      { $match: { project: projectObjectId, isActive: true } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    const complexityStats = await ReasoningChain.aggregate([
      { $match: { project: projectObjectId, isActive: true } },
      { $group: { _id: '$metadata.complexity', count: { $sum: 1 } } },
    ]);

    const result = {
      totalChains: stats[0]?.totalChains || 0,
      averageValidity: stats[0]?.avgValidity || 0,
      averageQuality: stats[0]?.avgQuality || 0,
      averageStepCount: stats[0]?.avgStepCount || 0,
      statusDistribution: {
        draft: stats[0]?.draft || 0,
        review: stats[0]?.review || 0,
        validated: stats[0]?.validated || 0,
        published: stats[0]?.published || 0,
        archived: stats[0]?.archived || 0,
      },
      issuesFound: {
        totalFallacies: stats[0]?.totalFallacies || 0,
        totalGaps: stats[0]?.totalGaps || 0,
      },
      byType: typeStats.reduce((acc, { _id, count }) => {
        if (_id) acc[_id] = count;
        return acc;
      }, {} as Record<string, number>),
      byComplexity: complexityStats.reduce((acc, { _id, count }) => {
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
 * GET /api/reasoning/search - Search reasoning chains by text
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

    const searchConditions: any = {
      $text: { $search: q.trim() },
      isActive: true,
    };

    if (projectId) {
      const hasAccess = await checkProjectAccess(
        projectId as string,
        req.user!._id.toString()
      );

      if (!hasAccess) {
        throw createError(REASONING_ERROR_MESSAGES.ACCESS_DENIED, 403, 'PROJECT_ACCESS_DENIED');
      }

      searchConditions.project = projectId;
    } else {
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

    const reasoningChains = await ReasoningChain.find(
      searchConditions,
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(Math.min(Number(limit), VALIDATION_LIMITS.SEARCH_MAX_RESULTS))
      .populate('claim', 'text type')
      .populate('creator', 'firstName lastName email')
      .populate('project', 'name');

    res.json({
      success: true,
      data: reasoningChains,
      meta: {
        query: q,
        count: reasoningChains.length,
        limit: Number(limit),
      },
    });
  })
);

/**
 * GET /api/reasoning/claim/:claimId - Get all reasoning chains for a specific claim
 */
router.get('/claim/:claimId',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { claimId } = req.params;

    if (!/^[0-9a-fA-F]{24}$/.test(claimId)) {
      throw createError('Invalid claim ID format', 400, 'INVALID_CLAIM_ID');
    }

    // Check cache first
    const cacheKey = `reasoning:claim:${claimId}:${req.user!._id.toString()}`;
    const cachedResult = await redisManager.get(cacheKey);
    if (cachedResult) {
      return res.json({
        success: true,
        data: cachedResult,
        cached: true,
      });
    }

    // Find the claim and verify access
    const claim = await Claim.findOne({ _id: claimId, isActive: true })
      .populate('project', 'owner collaborators visibility');

    if (!claim) {
      throw createError(REASONING_ERROR_MESSAGES.CLAIM_NOT_FOUND, 404, 'CLAIM_NOT_FOUND');
    }

    const project = claim.project as any;
    const userId = req.user!._id.toString();
    const hasAccess = project.visibility === 'public' ||
      project.owner.toString() === userId ||
      project.collaborators.some((c: any) => c.user.toString() === userId);

    if (!hasAccess) {
      throw createError(REASONING_ERROR_MESSAGES.ACCESS_DENIED, 403, 'CLAIM_ACCESS_DENIED');
    }

    // Find all reasoning chains for this claim
    const reasoningChains = await ReasoningChain.find({
      claim: claimId,
      isActive: true,
    })
      .populate('creator', 'firstName lastName email')
      .populate('steps.evidence', 'text type reliability.score')
      .sort({ 'validity.overallScore': -1, createdAt: -1 });

    // Cache result
    await redisManager.set(cacheKey, reasoningChains, VALIDATION_LIMITS.REASONING_CACHE_TTL);

    res.json({
      success: true,
      data: reasoningChains,
      meta: {
        claimId,
        count: reasoningChains.length,
      },
    });
  })
);

// ============================================================================
// LIST AND CRUD ROUTES
// ============================================================================

/**
 * GET /api/reasoning - List reasoning chains with filtering
 *
 * Query params:
 * - projectId: Filter by project
 * - claimId: Filter by associated claim
 * - type: Filter by reasoning type
 * - status: Filter by status
 * - minValidity: Minimum validity score
 * - complexity: Filter by complexity level
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
      minValidity,
      complexity,
      tags,
    } = req.query;

    const query: any = { isActive: true };

    // Project filter with access check
    if (projectId) {
      const hasAccess = await checkProjectAccess(
        projectId as string,
        req.user!._id.toString()
      );

      if (!hasAccess) {
        throw createError(REASONING_ERROR_MESSAGES.ACCESS_DENIED, 403, 'PROJECT_ACCESS_DENIED');
      }

      query.project = projectId;
    } else {
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

    if (claimId) query.claim = claimId;
    if (type) query.type = type;
    if (status) query.status = status;
    if (complexity) query['metadata.complexity'] = complexity;
    if (minValidity) {
      query['validity.overallScore'] = { $gte: parseFloat(minValidity as string) };
    }
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagArray };
    }

    // Build cache key
    const cacheKey = `reasoning:list:${JSON.stringify({
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
      logger.debug('Reasoning list served from cache', { cacheKey });
      return res.json({
        success: true,
        data: cachedResult.reasoningChains,
        pagination: cachedResult.pagination,
        cached: true,
      });
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortObj: any = {};
    sortObj[sort as string] = order === 'asc' ? 1 : -1;

    const [reasoningChains, total] = await Promise.all([
      ReasoningChain.find(query)
        .populate('claim', 'text type confidence')
        .populate('creator', 'firstName lastName email')
        .populate('project', 'name visibility')
        .sort(sortObj)
        .skip(skip)
        .limit(Math.min(Number(limit), VALIDATION_LIMITS.MAX_PAGE_SIZE)),
      ReasoningChain.countDocuments(query),
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
      { reasoningChains, pagination },
      VALIDATION_LIMITS.REASONING_CACHE_TTL
    );

    logger.info('Reasoning chains fetched', {
      count: reasoningChains.length,
      total,
      projectId,
      userId: req.user!._id.toString(),
    });

    res.json({
      success: true,
      data: reasoningChains,
      pagination,
    });
  })
);

/**
 * GET /api/reasoning/:id - Get single reasoning chain by ID
 */
router.get('/:id',
  authenticate,
  validate(validationSchemas.objectId, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Check cache first
    const cacheKey = `reasoning:${id}:${req.user!._id.toString()}`;
    const cachedResult = await redisManager.get(cacheKey);
    if (cachedResult) {
      return res.json({
        success: true,
        data: cachedResult,
        cached: true,
      });
    }

    const reasoningChain = await ReasoningChain.findOne({ _id: id, isActive: true })
      .populate('claim', 'text type confidence status')
      .populate('creator', 'firstName lastName email')
      .populate('project', 'name visibility owner collaborators')
      .populate('steps.evidence', 'text type reliability.score')
      .populate('collaborators.user', 'firstName lastName email')
      .populate('reviews.reviewer', 'firstName lastName email')
      .populate('validity.assessedBy', 'firstName lastName email');

    if (!reasoningChain) {
      throw createError(REASONING_ERROR_MESSAGES.NOT_FOUND, 404, 'REASONING_NOT_FOUND');
    }

    // Check project access
    const project = reasoningChain.project as any;
    const userId = req.user!._id.toString();
    const hasAccess = project.visibility === 'public' ||
      project.owner.toString() === userId ||
      project.collaborators.some((c: any) => c.user.toString() === userId);

    if (!hasAccess) {
      throw createError(REASONING_ERROR_MESSAGES.ACCESS_DENIED, 403, 'REASONING_ACCESS_DENIED');
    }

    // Cache result
    await redisManager.set(cacheKey, reasoningChain, VALIDATION_LIMITS.REASONING_CACHE_TTL);

    // Track view activity
    await redisManager.trackUserActivity(userId, {
      action: 'view_reasoning',
      reasoningChainId: reasoningChain._id,
      claimId: reasoningChain.claim,
    });

    res.json({
      success: true,
      data: reasoningChain,
    });
  })
);

/**
 * POST /api/reasoning - Create new reasoning chain manually
 */
router.post('/',
  authenticate,
  sanitize,
  validate(validationSchemas.createReasoningChain),
  asyncHandler(async (req: Request, res: Response) => {
    const { claimId, type, steps, tags } = req.body;

    // Validate claim exists
    const claim = await Claim.findOne({ _id: claimId, isActive: true })
      .populate('project', 'owner collaborators visibility');

    if (!claim) {
      throw createError(REASONING_ERROR_MESSAGES.CLAIM_NOT_FOUND, 404, 'CLAIM_NOT_FOUND');
    }

    // Check project access
    const project = claim.project as any;
    const userId = req.user!._id.toString();
    const hasAccess = await checkEditPermission(project._id.toString(), userId);

    if (!hasAccess) {
      throw createError(REASONING_ERROR_MESSAGES.ACCESS_DENIED, 403, 'PROJECT_EDIT_DENIED');
    }

    // Validate evidence references in steps
    const evidenceIds = steps.flatMap((step: any) => step.evidence || []);
    if (evidenceIds.length > 0) {
      const validEvidence = await Evidence.find({
        _id: { $in: evidenceIds },
        project: project._id,
        isActive: true,
      });

      if (validEvidence.length !== evidenceIds.length) {
        throw createError('One or more evidence references not found', 404, 'EVIDENCE_NOT_FOUND');
      }
    }

    // Create reasoning chain
    const reasoningChain = new ReasoningChain({
      claim: claimId,
      type,
      steps: steps.map((step: any, index: number) => ({
        ...step,
        stepNumber: step.stepNumber || index + 1,
        validation: {
          isValid: true,
          issues: [],
          suggestions: [],
        },
        metadata: {
          generatedBy: 'human',
          timestamp: new Date(),
        },
      })),
      project: project._id,
      creator: req.user!._id,
      tags: tags || [],
      metadata: {
        generationMethod: 'manual',
        complexity: 'intermediate',
        language: 'en',
        wordCount: 0,
      },
      status: 'draft',
    });

    await reasoningChain.save();

    // Populate for response
    await reasoningChain.populate([
      { path: 'claim', select: 'text type confidence' },
      { path: 'creator', select: 'firstName lastName email' },
      { path: 'project', select: 'name' },
    ]);

    // Clear related caches
    await redisManager.deletePattern('reasoning:*');

    // Track activity
    await redisManager.trackUserActivity(userId, {
      action: 'create_reasoning',
      reasoningChainId: reasoningChain._id,
      claimId,
    });

    logger.info(`Reasoning chain created: ${reasoningChain._id} by ${req.user!.email}`, {
      claimId,
      type,
      stepCount: steps.length,
    });

    res.status(201).json({
      success: true,
      message: 'Reasoning chain created successfully',
      data: reasoningChain,
    });
  })
);

/**
 * PUT /api/reasoning/:id - Update reasoning chain
 */
router.put('/:id',
  authenticate,
  sanitize,
  validate(validationSchemas.objectId, 'params'),
  validate(validationSchemas.updateReasoningChain),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    const reasoningChain = await ReasoningChain.findOne({ _id: id, isActive: true })
      .populate('project', 'owner collaborators');

    if (!reasoningChain) {
      throw createError(REASONING_ERROR_MESSAGES.NOT_FOUND, 404, 'REASONING_NOT_FOUND');
    }

    // Check if chain can be modified
    if (reasoningChain.status === 'archived') {
      throw createError(
        REASONING_ERROR_MESSAGES.CANNOT_MODIFY_ARCHIVED,
        403,
        'CANNOT_MODIFY_ARCHIVED'
      );
    }

    if (reasoningChain.status === 'published' && !updates.status) {
      throw createError(
        REASONING_ERROR_MESSAGES.CANNOT_MODIFY_PUBLISHED,
        403,
        'CANNOT_MODIFY_PUBLISHED'
      );
    }

    // Check edit permissions
    const userId = req.user!._id.toString();
    const canEdit = await checkEditPermission(
      reasoningChain.project._id.toString(),
      userId,
      reasoningChain.creator.toString()
    );

    if (!canEdit) {
      throw createError('No permission to edit this reasoning chain', 403, 'EDIT_PERMISSION_DENIED');
    }

    // Apply updates
    const allowedUpdates = ['type', 'steps', 'tags', 'status'];
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        (reasoningChain as any)[key] = updates[key];
      }
    }

    await reasoningChain.save();

    // Re-populate for response
    await reasoningChain.populate([
      { path: 'claim', select: 'text type confidence' },
      { path: 'creator', select: 'firstName lastName email' },
      { path: 'project', select: 'name' },
    ]);

    // Clear caches
    await redisManager.deletePattern('reasoning:*');

    // Track activity
    await redisManager.trackUserActivity(userId, {
      action: 'update_reasoning',
      reasoningChainId: reasoningChain._id,
      updatedFields: Object.keys(updates),
    });

    logger.info(`Reasoning chain updated: ${reasoningChain._id} by ${req.user!.email}`);

    res.json({
      success: true,
      message: 'Reasoning chain updated successfully',
      data: reasoningChain,
    });
  })
);

/**
 * DELETE /api/reasoning/:id - Soft delete reasoning chain
 */
router.delete('/:id',
  authenticate,
  validate(validationSchemas.objectId, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const reasoningChain = await ReasoningChain.findOne({ _id: id, isActive: true })
      .populate('project', 'owner collaborators');

    if (!reasoningChain) {
      throw createError(REASONING_ERROR_MESSAGES.NOT_FOUND, 404, 'REASONING_NOT_FOUND');
    }

    // Check delete permissions
    const userId = req.user!._id.toString();
    const project = reasoningChain.project as any;
    const canDelete = reasoningChain.creator.toString() === userId ||
      project.owner.toString() === userId ||
      project.collaborators.some((c: any) =>
        c.user.toString() === userId && c.permissions?.canDelete
      );

    if (!canDelete) {
      throw createError('No permission to delete this reasoning chain', 403, 'DELETE_PERMISSION_DENIED');
    }

    // Soft delete
    reasoningChain.isActive = false;
    await reasoningChain.save();

    // Clear caches
    await redisManager.deletePattern('reasoning:*');
    await redisManager.deletePattern(`reasoning:claim:${reasoningChain.claim}:*`);

    // Track activity
    await redisManager.trackUserActivity(userId, {
      action: 'delete_reasoning',
      reasoningChainId: reasoningChain._id,
      claimId: reasoningChain.claim,
    });

    logger.info(`Reasoning chain deleted: ${reasoningChain._id} by ${req.user!.email}`);

    res.json({
      success: true,
      message: 'Reasoning chain deleted successfully',
    });
  })
);

// ============================================================================
// ML SERVICE INTEGRATION ROUTES
// ============================================================================

/**
 * POST /api/reasoning/:id/validate - Validate reasoning chain with ML service
 *
 * Validates the logical structure and validity of reasoning steps
 */
router.post('/:id/validate',
  authenticate,
  validate(validationSchemas.objectId, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const reasoningChain = await ReasoningChain.findOne({ _id: id, isActive: true })
      .populate('project', 'owner collaborators visibility')
      .populate('claim', 'text');

    if (!reasoningChain) {
      throw createError(REASONING_ERROR_MESSAGES.NOT_FOUND, 404, 'REASONING_NOT_FOUND');
    }

    // Check access
    const project = reasoningChain.project as any;
    const userId = req.user!._id.toString();
    const hasAccess = project.visibility === 'public' ||
      project.owner.toString() === userId ||
      project.collaborators.some((c: any) => c.user.toString() === userId);

    if (!hasAccess) {
      throw createError(REASONING_ERROR_MESSAGES.ACCESS_DENIED, 403, 'ACCESS_DENIED');
    }

    // Check cache
    const cacheKey = `reasoning:validate:${id}`;
    const cachedResult = await redisManager.get(cacheKey);
    if (cachedResult) {
      return res.json({
        success: true,
        data: cachedResult,
        cached: true,
      });
    }

    // Get related evidence for context
    const evidenceIds = reasoningChain.steps.flatMap((step) => step.evidence);
    const evidence = await Evidence.find({ _id: { $in: evidenceIds } }).select('text');
    const evidenceTexts = evidence.map((e) => e.text);

    // Call ML service
    const mlResponse = await callMLService<any>('/reasoning/validate', {
      claim: (reasoningChain.claim as any).text,
      reasoning_steps: reasoningChain.steps.map((s) => s.text),
      reasoning_type: reasoningChain.type,
      evidence: evidenceTexts,
    });

    // Update reasoning chain with validation results
    reasoningChain.validity = {
      logicalValidity: mlResponse.logical_validity || 0,
      soundness: mlResponse.validation_score || 0,
      completeness: 0.7,
      coherence: 0.7,
      overallScore: mlResponse.validation_score || 0,
      assessedBy: req.user!._id,
      assessedAt: new Date(),
      validationNotes: mlResponse.is_valid ? 'Validated via ML service' : 'Issues found during validation',
    };

    // Update analysis with any issues found
    if (mlResponse.issues) {
      reasoningChain.analysis.fallacies = mlResponse.issues.fallacies || [];
      reasoningChain.analysis.gaps = (mlResponse.issues.logical_gaps || []).map((gap: any) => ({
        type: gap.type || 'weak_connection',
        description: gap.description || gap.message || 'Logical gap detected',
        location: gap.location || 1,
        severity: gap.severity || 0.5,
        suggestion: gap.suggestion || 'Review and strengthen this connection',
      }));
    }

    await reasoningChain.save();

    const result = {
      validationScore: mlResponse.validation_score,
      logicalValidity: mlResponse.logical_validity,
      isValid: mlResponse.is_valid,
      issues: mlResponse.issues,
      stepAnalysis: mlResponse.step_analysis,
      recommendations: mlResponse.recommendations,
    };

    // Cache result
    await redisManager.set(cacheKey, result, VALIDATION_LIMITS.REASONING_CACHE_TTL);

    // Track activity
    await redisManager.trackUserActivity(userId, {
      action: 'validate_reasoning',
      reasoningChainId: reasoningChain._id,
      validationScore: mlResponse.validation_score,
    });

    res.json({
      success: true,
      message: 'Reasoning chain validated',
      data: result,
    });
  })
);

/**
 * POST /api/reasoning/:id/fallacies - Detect fallacies in reasoning chain
 *
 * Uses ML service to identify logical fallacies, gaps, and weaknesses
 */
router.post('/:id/fallacies',
  authenticate,
  validate(validationSchemas.objectId, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
      includeFallacies = true,
      includeGaps = true,
      includeCounterarguments = false,
    } = req.body;

    const reasoningChain = await ReasoningChain.findOne({ _id: id, isActive: true })
      .populate('project', 'owner collaborators visibility')
      .populate('claim', 'text');

    if (!reasoningChain) {
      throw createError(REASONING_ERROR_MESSAGES.NOT_FOUND, 404, 'REASONING_NOT_FOUND');
    }

    // Check access
    const project = reasoningChain.project as any;
    const userId = req.user!._id.toString();
    const hasAccess = project.visibility === 'public' ||
      project.owner.toString() === userId ||
      project.collaborators.some((c: any) => c.user.toString() === userId);

    if (!hasAccess) {
      throw createError(REASONING_ERROR_MESSAGES.ACCESS_DENIED, 403, 'ACCESS_DENIED');
    }

    // Check cache
    const cacheKey = `reasoning:fallacies:${id}:${includeFallacies}:${includeGaps}:${includeCounterarguments}`;
    const cachedResult = await redisManager.get(cacheKey);
    if (cachedResult) {
      return res.json({
        success: true,
        data: cachedResult,
        cached: true,
      });
    }

    // Build request for ML service
    const mlRequest = {
      reasoning_chain: {
        steps: reasoningChain.steps.map((s) => ({
          step_number: s.stepNumber,
          text: s.text,
          confidence: s.confidence,
          type: s.type,
        })),
        reasoning_type: reasoningChain.type,
        logical_validity: reasoningChain.validity.logicalValidity,
        overall_confidence: reasoningChain.validity.overallScore,
      },
      include_fallacies: includeFallacies,
      include_gaps: includeGaps,
      include_counterarguments: includeCounterarguments,
      analysis_type: 'comprehensive',
    };

    // Call ML service
    const mlResponse = await callMLService<any>('/reasoning/analyze', mlRequest);

    // Update reasoning chain with analysis results
    if (mlResponse.analysis_results) {
      if (mlResponse.analysis_results.fallacies) {
        reasoningChain.analysis.fallacies = mlResponse.analysis_results.fallacies.map((f: any) => ({
          type: f.type || f.fallacy_type || 'unknown',
          description: f.description || f.message,
          stepNumbers: f.step_numbers || f.stepNumbers || [],
          severity: f.severity || 'medium',
          suggestion: f.suggestion || f.fix || 'Review and correct this fallacy',
        }));
      }

      if (mlResponse.analysis_results.logical_gaps) {
        reasoningChain.analysis.gaps = mlResponse.analysis_results.logical_gaps.map((g: any) => ({
          type: g.type || 'weak_connection',
          description: g.description || g.message,
          location: g.location || g.step_number || 1,
          severity: g.severity || 0.5,
          suggestion: g.suggestion || 'Fill this logical gap',
        }));
      }

      if (mlResponse.analysis_results.counterarguments) {
        reasoningChain.analysis.counterarguments = mlResponse.analysis_results.counterarguments.map((c: any) => ({
          text: c.text || c.argument,
          strength: c.strength || 0.5,
          source: c.source,
          refutation: c.refutation,
        }));
      }
    }

    await reasoningChain.save();

    const result = {
      chainId: reasoningChain._id,
      overallQuality: mlResponse.overall_quality,
      confidence: mlResponse.confidence,
      analysisResults: mlResponse.analysis_results,
      recommendations: mlResponse.recommendations,
    };

    // Cache result
    await redisManager.set(cacheKey, result, VALIDATION_LIMITS.REASONING_CACHE_TTL);

    // Clear related caches
    await redisManager.deletePattern(`reasoning:${id}:*`);

    // Track activity
    await redisManager.trackUserActivity(userId, {
      action: 'detect_fallacies',
      reasoningChainId: reasoningChain._id,
      fallaciesFound: reasoningChain.analysis.fallacies.length,
      gapsFound: reasoningChain.analysis.gaps.length,
    });

    res.json({
      success: true,
      message: 'Fallacy detection completed',
      data: result,
    });
  })
);

/**
 * POST /api/reasoning/:id/strengthen - Get suggestions to improve reasoning chain
 *
 * Uses ML service to suggest improvements for the reasoning chain
 */
router.post('/:id/strengthen',
  authenticate,
  validate(validationSchemas.objectId, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const reasoningChain = await ReasoningChain.findOne({ _id: id, isActive: true })
      .populate('project', 'owner collaborators visibility')
      .populate('claim', 'text');

    if (!reasoningChain) {
      throw createError(REASONING_ERROR_MESSAGES.NOT_FOUND, 404, 'REASONING_NOT_FOUND');
    }

    // Check access
    const project = reasoningChain.project as any;
    const userId = req.user!._id.toString();
    const hasAccess = project.visibility === 'public' ||
      project.owner.toString() === userId ||
      project.collaborators.some((c: any) => c.user.toString() === userId);

    if (!hasAccess) {
      throw createError(REASONING_ERROR_MESSAGES.ACCESS_DENIED, 403, 'ACCESS_DENIED');
    }

    // Check cache
    const cacheKey = `reasoning:strengthen:${id}`;
    const cachedResult = await redisManager.get(cacheKey);
    if (cachedResult) {
      return res.json({
        success: true,
        data: cachedResult,
        cached: true,
      });
    }

    // Get related evidence
    const evidenceIds = reasoningChain.steps.flatMap((step) => step.evidence);
    const evidence = await Evidence.find({ _id: { $in: evidenceIds } }).select('text');
    const evidenceTexts = evidence.map((e) => e.text);

    // Call ML service
    const mlResponse = await callMLService<any>('/reasoning/strengthen', {
      claim: (reasoningChain.claim as any).text,
      reasoning_steps: reasoningChain.steps.map((s) => s.text),
      evidence: evidenceTexts,
      reasoning_type: reasoningChain.type,
      complexity: reasoningChain.metadata.complexity,
    });

    const result = {
      originalClaim: (reasoningChain.claim as any).text,
      strengthenedReasoning: mlResponse.strengthened_reasoning,
      improvements: mlResponse.improvements,
      strengthIncrease: mlResponse.strength_increase,
      additionalEvidenceNeeded: mlResponse.additional_evidence_needed,
      qualityMetrics: mlResponse.quality_metrics,
    };

    // Cache result
    await redisManager.set(cacheKey, result, VALIDATION_LIMITS.REASONING_CACHE_TTL);

    // Track activity
    await redisManager.trackUserActivity(userId, {
      action: 'strengthen_reasoning',
      reasoningChainId: reasoningChain._id,
      strengthIncrease: mlResponse.strength_increase,
    });

    res.json({
      success: true,
      message: 'Reasoning strengthening suggestions generated',
      data: result,
    });
  })
);

/**
 * POST /api/reasoning/:id/review - Add a review to reasoning chain
 *
 * Body:
 * - rating: Number 1-5 (required)
 * - comments: Review comments (required)
 * - focusAreas: Array of focus areas (optional)
 */
router.post('/:id/review',
  authenticate,
  validate(validationSchemas.objectId, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { rating, comments, focusAreas = [] } = req.body;

    // Validate rating
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      throw createError('Rating must be a number between 1 and 5', 400, 'INVALID_RATING');
    }

    // Validate comments
    if (!comments || typeof comments !== 'string' || comments.trim().length < 10) {
      throw createError('Comments must be at least 10 characters', 400, 'INVALID_COMMENTS');
    }

    const reasoningChain = await ReasoningChain.findOne({ _id: id, isActive: true })
      .populate('project', 'owner collaborators visibility');

    if (!reasoningChain) {
      throw createError(REASONING_ERROR_MESSAGES.NOT_FOUND, 404, 'REASONING_NOT_FOUND');
    }

    // Check access
    const project = reasoningChain.project as any;
    const userId = req.user!._id.toString();
    const hasAccess = project.visibility === 'public' ||
      project.owner.toString() === userId ||
      project.collaborators.some((c: any) => c.user.toString() === userId);

    if (!hasAccess) {
      throw createError(REASONING_ERROR_MESSAGES.ACCESS_DENIED, 403, 'ACCESS_DENIED');
    }

    // Check if user already reviewed
    const existingReview = reasoningChain.reviews.find(
      (r: any) => r.reviewer.toString() === userId
    );

    if (existingReview) {
      throw createError('You have already reviewed this reasoning chain', 400, 'ALREADY_REVIEWED');
    }

    // Add review using model method
    await reasoningChain.addReview(userId, rating, comments.trim(), focusAreas);

    // Clear caches
    await redisManager.deletePattern(`reasoning:${id}:*`);

    // Track activity
    await redisManager.trackUserActivity(userId, {
      action: 'review_reasoning',
      reasoningChainId: reasoningChain._id,
      rating,
    });

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      data: reasoningChain.reviews[reasoningChain.reviews.length - 1],
    });
  })
);

export default router;
