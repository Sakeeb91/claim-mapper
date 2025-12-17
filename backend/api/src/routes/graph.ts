import express from 'express';
import { Request, Response } from 'express';
import Claim from '../models/Claim';
import Evidence from '../models/Evidence';
import Project from '../models/Project';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validate, validationSchemas } from '../middleware/validation';
import { asyncHandler, createError } from '../middleware/errorHandler';
import redisManager from '../config/redis';
import { logger } from '../utils/logger';
import { GraphAnalyzer, GraphMetrics } from '../lib/graph/analyzer';
import { VALIDATION_LIMITS } from '../constants/validation';

const router = express.Router();
const graphAnalyzer = new GraphAnalyzer();

// Types for graph nodes and links
interface GraphNode {
  id: string;
  type: 'claim' | 'evidence' | 'reasoning';
  label: string;
  data: {
    claimType?: string;
    evidenceType?: string;
    confidence: number;
    status?: string;
    tags?: string[];
    quality?: number;
    createdAt?: Date;
  };
}

interface GraphLink {
  id: string;
  source: string;
  target: string;
  type: 'supports' | 'contradicts' | 'neutral' | 'related' | 'questions' | 'elaborates' | 'similar';
  confidence: number;
  label?: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  metrics: GraphMetrics;
}

/**
 * Transform a claim document to a graph node
 */
function claimToNode(claim: any): GraphNode {
  const labelMaxLength = VALIDATION_LIMITS.GRAPH_LABEL_MAX_LENGTH;
  return {
    id: claim._id.toString(),
    type: 'claim',
    label: claim.text.length > labelMaxLength
      ? claim.text.substring(0, labelMaxLength) + '...'
      : claim.text,
    data: {
      claimType: claim.type,
      confidence: claim.confidence,
      status: claim.status,
      tags: claim.tags,
      quality: claim.quality?.overallScore,
      createdAt: claim.createdAt,
    },
  };
}

/**
 * Transform an evidence document to a graph node
 */
function evidenceToNode(evidence: any): GraphNode {
  const labelMaxLength = VALIDATION_LIMITS.GRAPH_LABEL_MAX_LENGTH;
  return {
    id: evidence._id.toString(),
    type: 'evidence',
    label: evidence.text.length > labelMaxLength
      ? evidence.text.substring(0, labelMaxLength) + '...'
      : evidence.text,
    data: {
      evidenceType: evidence.type,
      confidence: evidence.reliability?.score || 0.5,
      status: evidence.verification?.status,
      tags: evidence.tags,
      quality: evidence.quality?.overallScore,
      createdAt: evidence.createdAt,
    },
  };
}

/**
 * Check if user has access to project
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
 * GET /api/graph - Get graph data for a project or set of claims
 *
 * Query params:
 * - projectId: MongoDB ObjectId of the project
 * - claimIds: Array of claim IDs to build graph from
 * - maxDepth: Maximum depth for relationship traversal (1-5, default 2)
 * - includeEvidence: Whether to include evidence nodes (default true)
 * - includeReasoning: Whether to include reasoning chain nodes (default false)
 * - minConfidence: Minimum confidence threshold for nodes
 * - types: Filter by node types (claim, evidence, reasoning)
 * - limit: Maximum number of nodes to return (default 500, max 1000)
 */
router.get('/',
  optionalAuth,
  validate(validationSchemas.graphQuery, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      projectId,
      claimIds,
      maxDepth = VALIDATION_LIMITS.GRAPH_DEFAULT_DEPTH,
      includeEvidence = true,
      includeReasoning = false,
      minConfidence,
      types,
      limit = 500,
    } = req.query;

    // Validate that at least projectId or claimIds is provided
    if (!projectId && !claimIds) {
      throw createError(
        'Either projectId or claimIds is required',
        400,
        'MISSING_GRAPH_FILTER'
      );
    }

    // Build cache key
    const cacheKey = `graph:${JSON.stringify({
      projectId,
      claimIds,
      maxDepth,
      includeEvidence,
      includeReasoning,
      minConfidence,
      types,
      limit,
      userId: req.user?._id?.toString(),
    })}`;

    // Check cache first
    const cachedResult = await redisManager.get(cacheKey);
    if (cachedResult) {
      logger.debug('Graph data served from cache', { cacheKey });
      res.json({
        success: true,
        data: cachedResult,
        cached: true,
      });
      return;
    }

    // Build query for claims
    const query: any = { isActive: true };
    let accessibleProjectIds: string[] = [];

    if (projectId) {
      // Check project access
      const hasAccess = await checkProjectAccess(
        projectId as string,
        req.user?._id?.toString()
      );

      if (!hasAccess) {
        throw createError(
          'Access denied to project',
          403,
          'PROJECT_ACCESS_DENIED'
        );
      }

      query.project = projectId;
      accessibleProjectIds = [projectId as string];
    } else if (claimIds) {
      // Handle both single ID and array of IDs
      const ids = Array.isArray(claimIds) ? claimIds : [claimIds];
      query._id = { $in: ids };

      // We'll verify access per claim below
    } else if (req.user) {
      // Get all projects user has access to
      const userProjects = await Project.find({
        $or: [
          { owner: req.user._id },
          { 'collaborators.user': req.user._id },
          { visibility: 'public' },
        ],
        isActive: true,
      }).select('_id');

      accessibleProjectIds = userProjects.map((p) => p._id.toString());
      query.project = { $in: accessibleProjectIds };
    } else {
      // Unauthenticated user - only public projects
      const publicProjects = await Project.find({
        visibility: 'public',
        isActive: true,
      }).select('_id');

      accessibleProjectIds = publicProjects.map((p) => p._id.toString());
      query.project = { $in: accessibleProjectIds };
    }

    // Apply confidence filter
    if (minConfidence !== undefined) {
      query.confidence = { $gte: parseFloat(minConfidence as string) };
    }

    // Apply type filter for claims
    const nodeTypes = types
      ? (Array.isArray(types) ? types : [types])
      : ['claim', 'evidence', 'reasoning'];

    // Fetch claims with relationships
    const claims = await Claim.find(query)
      .populate('evidence', 'text type reliability.score verification.status tags quality createdAt')
      .populate('relatedClaims.claimId', 'text type confidence status tags quality createdAt')
      .populate('reasoningChains', 'type steps validity.overallScore')
      .limit(Number(limit))
      .lean();

    // Build nodes and links
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeIdSet = new Set<string>();
    const linkIdSet = new Set<string>();

    // Process claims
    if (nodeTypes.includes('claim')) {
      for (const claim of claims) {
        // Verify access if using claimIds filter
        if (claimIds && !projectId) {
          const claimProjectId = claim.project?.toString();
          if (claimProjectId) {
            const hasAccess = await checkProjectAccess(
              claimProjectId,
              req.user?._id?.toString()
            );
            if (!hasAccess) {
              continue; // Skip claims user doesn't have access to
            }
          }
        }

        const nodeId = claim._id.toString();
        if (!nodeIdSet.has(nodeId)) {
          nodes.push(claimToNode(claim));
          nodeIdSet.add(nodeId);
        }

        // Process evidence relationships
        if (includeEvidence && nodeTypes.includes('evidence') && claim.evidence) {
          for (const evidence of claim.evidence as any[]) {
            if (!evidence || !evidence._id) continue;

            const evidenceId = evidence._id.toString();
            if (!nodeIdSet.has(evidenceId)) {
              nodes.push(evidenceToNode(evidence));
              nodeIdSet.add(evidenceId);
            }

            // Create link from evidence to claim
            const linkId = `${evidenceId}-${nodeId}`;
            if (!linkIdSet.has(linkId)) {
              links.push({
                id: linkId,
                source: evidenceId,
                target: nodeId,
                type: 'supports',
                confidence: evidence.reliability?.score || 0.5,
                label: 'supports',
              });
              linkIdSet.add(linkId);
            }
          }
        }

        // Process related claims
        if (claim.relatedClaims) {
          for (const related of claim.relatedClaims) {
            const relatedClaim = related.claimId as any;
            if (!relatedClaim || !relatedClaim._id) continue;

            const relatedId = relatedClaim._id.toString();

            // Add related claim node if not already present and within limit
            if (!nodeIdSet.has(relatedId) && nodes.length < Number(limit)) {
              nodes.push(claimToNode(relatedClaim));
              nodeIdSet.add(relatedId);
            }

            // Create link between claims (only if both nodes exist)
            if (nodeIdSet.has(relatedId)) {
              const linkId = `${nodeId}-${relatedId}`;
              const reverseLinkId = `${relatedId}-${nodeId}`;

              // Avoid duplicate links
              if (!linkIdSet.has(linkId) && !linkIdSet.has(reverseLinkId)) {
                links.push({
                  id: linkId,
                  source: nodeId,
                  target: relatedId,
                  type: related.relationship as GraphLink['type'],
                  confidence: related.confidence,
                  label: related.relationship,
                });
                linkIdSet.add(linkId);
              }
            }
          }
        }
      }
    }

    // Apply node limit
    const maxNodes = Math.min(Number(limit), VALIDATION_LIMITS.GRAPH_MAX_NODES);
    const limitedNodes = nodes.slice(0, maxNodes);
    const limitedNodeIds = new Set(limitedNodes.map((n) => n.id));

    // Filter links to only include those between existing nodes
    const limitedLinks = links.filter(
      (link) => limitedNodeIds.has(link.source) && limitedNodeIds.has(link.target)
    ).slice(0, VALIDATION_LIMITS.GRAPH_MAX_LINKS);

    // Calculate metrics
    const metrics = graphAnalyzer.calculateMetrics(limitedNodes, limitedLinks);

    // Build response
    const graphData: GraphData = {
      nodes: limitedNodes,
      links: limitedLinks,
      metrics,
    };

    // Cache result
    await redisManager.set(
      cacheKey,
      graphData,
      VALIDATION_LIMITS.GRAPH_CACHE_TTL
    );

    // Track activity if authenticated
    if (req.user) {
      await redisManager.trackUserActivity(req.user._id.toString(), {
        action: 'view_graph',
        projectId: projectId || 'multiple',
        nodeCount: limitedNodes.length,
        linkCount: limitedLinks.length,
      });
    }

    logger.info('Graph data generated', {
      projectId,
      nodeCount: limitedNodes.length,
      linkCount: limitedLinks.length,
      userId: req.user?._id?.toString(),
    });

    res.json({
      success: true,
      data: graphData,
    });
  })
);

/**
 * GET /api/graph/claim/:claimId - Get graph centered on a specific claim
 *
 * Returns the claim and all its relationships up to maxDepth
 */
router.get('/claim/:claimId',
  optionalAuth,
  validate(validationSchemas.objectId, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { claimId } = req.params;
    const { maxDepth = 2, includeEvidence = true } = req.query;

    // Check cache first
    const cacheKey = `graph:claim:${claimId}:${maxDepth}:${includeEvidence}:${req.user?._id?.toString()}`;
    const cachedResult = await redisManager.get(cacheKey);
    if (cachedResult) {
      res.json({
        success: true,
        data: cachedResult,
        cached: true,
      });
      return;
    }

    // Fetch the claim with relationships
    const claim = await Claim.findOne({ _id: claimId, isActive: true })
      .populate('project', 'owner collaborators visibility')
      .populate('evidence', 'text type reliability.score verification.status tags quality createdAt')
      .populate('relatedClaims.claimId', 'text type confidence status tags quality createdAt')
      .lean();

    if (!claim) {
      throw createError('Claim not found', 404, 'CLAIM_NOT_FOUND');
    }

    // Check access
    const project = claim.project as any;
    const userId = req.user?._id?.toString();
    const hasAccess = project.visibility === 'public' ||
      (userId && (
        project.owner.toString() === userId ||
        project.collaborators.some((c: any) => c.user.toString() === userId)
      ));

    if (!hasAccess) {
      throw createError('Access denied to claim', 403, 'CLAIM_ACCESS_DENIED');
    }

    // Build graph
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeIdSet = new Set<string>();
    const linkIdSet = new Set<string>();

    // Add central claim
    const centralId = claim._id.toString();
    nodes.push(claimToNode(claim));
    nodeIdSet.add(centralId);

    // Add evidence
    if (includeEvidence && claim.evidence) {
      for (const evidence of claim.evidence as any[]) {
        if (!evidence || !evidence._id) continue;

        const evidenceId = evidence._id.toString();
        if (!nodeIdSet.has(evidenceId)) {
          nodes.push(evidenceToNode(evidence));
          nodeIdSet.add(evidenceId);

          const linkId = `${evidenceId}-${centralId}`;
          links.push({
            id: linkId,
            source: evidenceId,
            target: centralId,
            type: 'supports',
            confidence: evidence.reliability?.score || 0.5,
            label: 'supports',
          });
          linkIdSet.add(linkId);
        }
      }
    }

    // Add related claims
    if (claim.relatedClaims) {
      for (const related of claim.relatedClaims) {
        const relatedClaim = related.claimId as any;
        if (!relatedClaim || !relatedClaim._id) continue;

        const relatedId = relatedClaim._id.toString();
        if (!nodeIdSet.has(relatedId)) {
          nodes.push(claimToNode(relatedClaim));
          nodeIdSet.add(relatedId);

          const linkId = `${centralId}-${relatedId}`;
          links.push({
            id: linkId,
            source: centralId,
            target: relatedId,
            type: related.relationship as GraphLink['type'],
            confidence: related.confidence,
            label: related.relationship,
          });
          linkIdSet.add(linkId);
        }
      }
    }

    // Calculate metrics
    const metrics = graphAnalyzer.calculateMetrics(nodes, links);

    const graphData: GraphData = {
      nodes,
      links,
      metrics,
    };

    // Cache result
    await redisManager.set(cacheKey, graphData, VALIDATION_LIMITS.GRAPH_CACHE_TTL);

    res.json({
      success: true,
      data: graphData,
    });
  })
);

/**
 * GET /api/graph/metrics/:projectId - Get graph metrics for a project
 *
 * Returns metrics without full graph data (faster for large graphs)
 */
router.get('/metrics/:projectId',
  authenticate,
  validate(validationSchemas.objectId, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;

    // Check project access
    const hasAccess = await checkProjectAccess(
      projectId,
      req.user!._id.toString()
    );

    if (!hasAccess) {
      throw createError('Access denied to project', 403, 'PROJECT_ACCESS_DENIED');
    }

    // Check cache first
    const cacheKey = `graph:metrics:${projectId}`;
    const cachedResult = await redisManager.get(cacheKey);
    if (cachedResult) {
      res.json({
        success: true,
        data: cachedResult,
        cached: true,
      });
      return;
    }

    // Count claims and evidence
    const [claimCount, evidenceCount, claimsWithRelations] = await Promise.all([
      Claim.countDocuments({ project: projectId, isActive: true }),
      Evidence.countDocuments({ project: projectId, isActive: true }),
      Claim.find({ project: projectId, isActive: true })
        .select('relatedClaims evidence')
        .lean(),
    ]);

    // Calculate link count from relationships
    let linkCount = 0;
    const relationshipSet = new Set<string>();

    for (const claim of claimsWithRelations) {
      // Count evidence links
      linkCount += (claim.evidence?.length || 0);

      // Count claim-to-claim relationships (avoid double counting)
      for (const related of claim.relatedClaims || []) {
        const key = [claim._id.toString(), related.claimId.toString()].sort().join('-');
        if (!relationshipSet.has(key)) {
          relationshipSet.add(key);
          linkCount++;
        }
      }
    }

    const nodeCount = claimCount + evidenceCount;
    const maxPossibleLinks = (nodeCount * (nodeCount - 1)) / 2;
    const density = maxPossibleLinks > 0 ? linkCount / maxPossibleLinks : 0;
    const averageDegree = nodeCount > 0 ? (2 * linkCount) / nodeCount : 0;

    const metrics: GraphMetrics & { claimCount: number; evidenceCount: number } = {
      nodeCount,
      linkCount,
      density,
      averageDegree,
      clusters: 0, // TODO: Implement cluster detection
      claimCount,
      evidenceCount,
    };

    // Find central nodes (most connected)
    const centralNodes = graphAnalyzer.findCentralNodes(
      claimsWithRelations.map((c) => ({
        id: c._id.toString(),
        type: 'claim',
      })),
      claimsWithRelations.flatMap((c) => [
        ...(c.evidence || []).map((e: any) => ({
          source: e.toString(),
          target: c._id.toString(),
        })),
        ...(c.relatedClaims || []).map((r: any) => ({
          source: c._id.toString(),
          target: r.claimId.toString(),
        })),
      ]),
      5
    );

    const result = {
      metrics,
      centralNodes,
      timestamp: new Date(),
    };

    // Cache result
    await redisManager.set(cacheKey, result, VALIDATION_LIMITS.GRAPH_CACHE_TTL);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * DELETE /api/graph/cache/:projectId - Clear graph cache for a project
 *
 * Useful when data has been updated and fresh graph is needed
 */
router.delete('/cache/:projectId',
  authenticate,
  validate(validationSchemas.objectId, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;

    // Check project access
    const hasAccess = await checkProjectAccess(
      projectId,
      req.user!._id.toString()
    );

    if (!hasAccess) {
      throw createError('Access denied to project', 403, 'PROJECT_ACCESS_DENIED');
    }

    // Delete all graph cache entries for this project
    await redisManager.deletePattern(`graph:*${projectId}*`);

    logger.info('Graph cache cleared', {
      projectId,
      userId: req.user!._id.toString(),
    });

    res.json({
      success: true,
      message: 'Graph cache cleared successfully',
    });
  })
);

export default router;
