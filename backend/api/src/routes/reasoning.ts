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
