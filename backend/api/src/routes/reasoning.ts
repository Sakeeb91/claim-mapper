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
    });
  })
);
