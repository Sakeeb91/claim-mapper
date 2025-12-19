import express from 'express';
import { Request, Response } from 'express';
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

// Routes will be added in subsequent commits

export default router;
