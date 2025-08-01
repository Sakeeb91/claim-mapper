import express from 'express';
import { Request, Response } from 'express';
import axios from 'axios';
import Claim from '../models/Claim';
import Evidence from '../models/Evidence';
import Project from '../models/Project';
import ReasoningChain from '../models/ReasoningChain';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validate, validationSchemas, sanitize, validatePagination } from '../middleware/validation';
import { asyncHandler, createError } from '../middleware/errorHandler';
import redisManager from '../config/redis';
import { logger } from '../utils/logger';

const router = express.Router();

// GET /api/search - Universal search across all content types
router.get('/',
  optionalAuth,
  validatePagination,
  asyncHandler(async (req: Request, res: Response) => {
    const { 
      q, 
      type = 'all', 
      page = 1, 
      limit = 20, 
      sort = 'relevance',
      projectId,
      minConfidence,
      dateFrom,
      dateTo,
      tags,
      status
    } = req.query;

    if (!q || (q as string).trim().length < 2) {
      throw createError('Search query must be at least 2 characters', 400, 'INVALID_SEARCH_QUERY');
    }

    const searchQuery = (q as string).trim();
    const searchTypes = type === 'all' ? ['claims', 'evidence', 'reasoning', 'projects'] : [type];

    // Check cache first
    const cacheKey = `search:${Buffer.from(JSON.stringify({ 
      q: searchQuery, 
      type, 
      page, 
      limit, 
      sort, 
      projectId, 
      minConfidence, 
      dateFrom, 
      dateTo, 
      tags, 
      status,
      userId: req.user?._id 
    })).toString('base64')}`;

    const cachedResult = await redisManager.get(cacheKey);
    if (cachedResult) {
      // Track search analytics
      await redisManager.incrementMetric('search:cached');
      
      res.json({
        success: true,
        data: cachedResult.results,
        pagination: cachedResult.pagination,
        facets: cachedResult.facets,
        searchQuery,
        searchTypes,
        cached: true,
        executionTime: cachedResult.executionTime,
      });
      return;
    }

    const startTime = Date.now();
    const results: any = {
      claims: [],
      evidence: [],
      reasoning: [],
      projects: [],
    };

    // Build base filters
    const baseFilters: any = { isActive: true };
    
    if (dateFrom || dateTo) {
      baseFilters.createdAt = {};
      if (dateFrom) baseFilters.createdAt.$gte = new Date(dateFrom as string);
      if (dateTo) baseFilters.createdAt.$lte = new Date(dateTo as string);
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      baseFilters.tags = { $in: tagArray };
    }

    if (status) {
      baseFilters.status = status;
    }

    // Build project access filter
    let projectAccessFilter: any = {};
    if (req.user) {
      if (projectId) {
        // Specific project - verify access
        const project = await Project.findById(projectId);
        if (!project) {
          throw createError('Project not found', 404, 'PROJECT_NOT_FOUND');
        }

        const hasAccess = project.owner.toString() === req.user._id.toString() ||
          project.collaborators.some(c => c.user.toString() === req.user._id.toString()) ||
          project.visibility === 'public';

        if (!hasAccess) {
          throw createError('Access denied to project', 403, 'PROJECT_ACCESS_DENIED');
        }

        projectAccessFilter = { project: projectId };
      } else {
        // All accessible projects
        const userProjects = await Project.find({
          $or: [
            { owner: req.user._id },
            { 'collaborators.user': req.user._id },
            { visibility: 'public' }
          ],
          isActive: true
        }).select('_id');

        projectAccessFilter = { project: { $in: userProjects.map(p => p._id) } };
      }
    } else {
      // Public projects only for unauthenticated users
      const publicProjects = await Project.find({
        visibility: 'public',
        isActive: true
      }).select('_id');

      projectAccessFilter = { project: { $in: publicProjects.map(p => p._id) } };
    }

    // Execute searches in parallel
    const searchPromises = [];

    if (searchTypes.includes('claims')) {
      const claimFilters = {
        ...baseFilters,
        ...projectAccessFilter,
        $text: { $search: searchQuery }
      };

      if (minConfidence) {
        claimFilters.confidence = { $gte: parseFloat(minConfidence as string) };
      }

      searchPromises.push(
        Claim.find(claimFilters, { score: { $meta: 'textScore' } })
          .populate('creator', 'firstName lastName email')
          .populate('project', 'name visibility')
          .populate('evidence', 'text type reliability.score')
          .sort(sort === 'relevance' ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
          .limit(Number(limit))
          .then(claims => {
            results.claims = claims.map(claim => ({
              ...claim.toObject(),
              type: 'claim',
              relevanceScore: claim.get('score')
            }));
          })
      );
    }

    if (searchTypes.includes('evidence')) {
      const evidenceFilters = {
        ...baseFilters,
        ...projectAccessFilter,
        $text: { $search: searchQuery }
      };

      searchPromises.push(
        Evidence.find(evidenceFilters, { score: { $meta: 'textScore' } })
          .populate('addedBy', 'firstName lastName email')
          .populate('project', 'name visibility')
          .populate('claims', 'text type')
          .sort(sort === 'relevance' ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
          .limit(Number(limit))
          .then(evidence => {
            results.evidence = evidence.map(item => ({
              ...item.toObject(),
              type: 'evidence',
              relevanceScore: item.get('score')
            }));
          })
      );
    }

    if (searchTypes.includes('reasoning')) {
      const reasoningFilters = {
        ...baseFilters,
        ...projectAccessFilter,
        $text: { $search: searchQuery }
      };

      searchPromises.push(
        ReasoningChain.find(reasoningFilters, { score: { $meta: 'textScore' } })
          .populate('creator', 'firstName lastName email')
          .populate('project', 'name visibility')
          .populate('claim', 'text type')
          .sort(sort === 'relevance' ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
          .limit(Number(limit))
          .then(reasoning => {
            results.reasoning = reasoning.map(item => ({
              ...item.toObject(),
              type: 'reasoning',
              relevanceScore: item.get('score')
            }));
          })
      );
    }

    if (searchTypes.includes('projects') && !projectId) {
      let projectFilters: any = {
        ...baseFilters,
        $text: { $search: searchQuery }
      };

      // For projects, apply visibility rules differently
      if (req.user) {
        projectFilters = {
          ...projectFilters,
          $or: [
            { owner: req.user._id },
            { 'collaborators.user': req.user._id },
            { visibility: 'public' }
          ]
        };
      } else {
        projectFilters.visibility = 'public';
      }

      searchPromises.push(
        Project.find(projectFilters, { score: { $meta: 'textScore' } })
          .populate('owner', 'firstName lastName')
          .select('-collaborators -settings -integration') // Hide sensitive info
          .sort(sort === 'relevance' ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
          .limit(Number(limit))
          .then(projects => {
            results.projects = projects.map(project => ({
              ...project.toObject(),
              type: 'project',
              relevanceScore: project.get('score')
            }));
          })
      );
    }

    // Execute all searches
    await Promise.all(searchPromises);

    // Combine and sort results if searching all types
    let combinedResults: any[] = [];
    if (type === 'all') {
      combinedResults = [
        ...results.claims,
        ...results.evidence,
        ...results.reasoning,
        ...results.projects
      ];

      if (sort === 'relevance') {
        combinedResults.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
      } else {
        combinedResults.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }

      // Paginate combined results
      const startIndex = (Number(page) - 1) * Number(limit);
      combinedResults = combinedResults.slice(startIndex, startIndex + Number(limit));
    } else {
      combinedResults = results[type as string] || [];
    }

    // Generate facets for filtering
    const facets = await generateSearchFacets(searchQuery, projectAccessFilter, req.user);

    const totalResults = combinedResults.length;
    const pagination = {
      page: Number(page),
      limit: Number(limit),
      total: totalResults,
      totalPages: Math.ceil(totalResults / Number(limit)),
      hasNext: Number(page) < Math.ceil(totalResults / Number(limit)),
      hasPrev: Number(page) > 1,
    };

    const executionTime = Date.now() - startTime;

    // Cache results for 10 minutes
    await redisManager.set(cacheKey, {
      results: combinedResults,
      pagination,
      facets,
      executionTime
    }, 600);

    // Track search analytics
    await Promise.all([
      redisManager.incrementMetric('search:executed'),
      redisManager.incrementMetric(`search:type:${type}`),
      redisManager.trackUserActivity(req.user?._id?.toString() || 'anonymous', {
        action: 'search',
        query: searchQuery,
        type,
        resultsCount: totalResults,
        executionTime,
      })
    ]);

    res.json({
      success: true,
      data: combinedResults,
      pagination,
      facets,
      searchQuery,
      searchTypes,
      executionTime,
    });
  })
);

// GET /api/search/suggestions - Get search suggestions and autocomplete
router.get('/suggestions',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { q, limit = 10 } = req.query;

    if (!q || (q as string).length < 2) {
      res.json({
        success: true,
        data: {
          suggestions: [],
          recent: await getRecentSearches(req.user?._id?.toString()),
        },
      });
      return;
    }

    const searchQuery = (q as string).trim();

    // Check cache
    const cacheKey = `suggestions:${Buffer.from(searchQuery).toString('base64')}:${req.user?._id || 'anonymous'}`;
    const cachedSuggestions = await redisManager.get(cacheKey);
    if (cachedSuggestions) {
      res.json({
        success: true,
        data: cachedSuggestions,
        cached: true,
      });
      return;
    }

    // Build project access filter
    let projectAccessFilter: any = {};
    if (req.user) {
      const userProjects = await Project.find({
        $or: [
          { owner: req.user._id },
          { 'collaborators.user': req.user._id },
          { visibility: 'public' }
        ],
        isActive: true
      }).select('_id');
      projectAccessFilter = { project: { $in: userProjects.map(p => p._id) } };
    } else {
      const publicProjects = await Project.find({
        visibility: 'public',
        isActive: true
      }).select('_id');
      projectAccessFilter = { project: { $in: publicProjects.map(p => p._id) } };
    }

    // Get suggestions from different sources
    const [claimSuggestions, evidenceSuggestions, tagSuggestions] = await Promise.all([
      // Claim suggestions
      Claim.find({
        ...projectAccessFilter,
        text: { $regex: searchQuery, $options: 'i' },
        isActive: true
      })
        .select('text type confidence')
        .limit(Number(limit) / 3)
        .lean(),

      // Evidence suggestions
      Evidence.find({
        ...projectAccessFilter,
        text: { $regex: searchQuery, $options: 'i' },
        isActive: true
      })
        .select('text type reliability.score')
        .limit(Number(limit) / 3)
        .lean(),

      // Tag suggestions
      Claim.aggregate([
        {
          $match: {
            ...projectAccessFilter,
            tags: { $regex: searchQuery, $options: 'i' },
            isActive: true
          }
        },
        { $unwind: '$tags' },
        {
          $match: {
            tags: { $regex: searchQuery, $options: 'i' }
          }
        },
        {
          $group: {
            _id: '$tags',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: Number(limit) / 3 }
      ])
    ]);

    const suggestions = {
      suggestions: [
        ...claimSuggestions.map(claim => ({
          type: 'claim',
          text: claim.text.substring(0, 100) + '...',
          value: claim.text,
          confidence: claim.confidence,
        })),
        ...evidenceSuggestions.map(evidence => ({
          type: 'evidence',  
          text: evidence.text.substring(0, 100) + '...',
          value: evidence.text,
          reliability: evidence.reliability?.score,
        })),
        ...tagSuggestions.map(tag => ({
          type: 'tag',
          text: tag._id,
          value: tag._id,
          count: tag.count,
        }))
      ].slice(0, Number(limit)),
      recent: await getRecentSearches(req.user?._id?.toString()),
    };

    // Cache for 5 minutes
    await redisManager.set(cacheKey, suggestions, 300);

    res.json({
      success: true,
      data: suggestions,
    });
  })
);

// POST /api/search/semantic - Semantic similarity search using ML service
router.post('/semantic',
  authenticate,
  sanitize,
  asyncHandler(async (req: Request, res: Response) => {
    const { query, type = 'claims', limit = 10, threshold = 0.7 } = req.body;

    if (!query || query.trim().length < 5) {
      throw createError('Semantic search query must be at least 5 characters', 400, 'INVALID_SEMANTIC_QUERY');
    }

    try {
      // Get user's accessible content
      const userProjects = await Project.find({
        $or: [
          { owner: req.user!._id },
          { 'collaborators.user': req.user!._id },
          { visibility: 'public' }
        ],
        isActive: true
      }).select('_id');

      const projectIds = userProjects.map(p => p._id);

      let candidates: string[] = [];
      let candidateItems: any[] = [];

      if (type === 'claims') {
        const claims = await Claim.find({
          project: { $in: projectIds },
          isActive: true
        })
          .populate('creator', 'firstName lastName email')
          .populate('project', 'name')
          .limit(1000); // Limit for performance

        candidates = claims.map(claim => claim.text);
        candidateItems = claims;
      } else if (type === 'evidence') {
        const evidence = await Evidence.find({
          project: { $in: projectIds },
          isActive: true
        })
          .populate('addedBy', 'firstName lastName email')
          .populate('project', 'name')
          .limit(1000);

        candidates = evidence.map(item => item.text);
        candidateItems = evidence;
      }

      if (candidates.length === 0) {
        res.json({
          success: true,
          data: [],
          message: 'No content available for semantic search',
        });
        return;
      }

      // Call ML service for semantic similarity
      const mlResponse = await axios.post(`${process.env.ML_SERVICE_URL}/similarity`, {
        query_claim: query,
        candidate_claims: candidates,
        top_k: Number(limit),
        threshold: Number(threshold)
      }, {
        headers: {
          'X-API-Key': process.env.ML_SERVICE_API_KEY,
        },
        timeout: 30000,
      });

      // Map results back to original items
      const similarItems = mlResponse.data.similar_claims.map((result: any) => {
        const originalIndex = candidates.indexOf(result.text);
        if (originalIndex >= 0) {
          return {
            ...candidateItems[originalIndex].toObject(),
            similarity: result.similarity,
            rank: result.rank,
          };
        }
        return null;
      }).filter(Boolean);

      // Track semantic search
      await redisManager.trackUserActivity(req.user!._id.toString(), {
        action: 'semantic_search',
        query,
        type,
        resultsCount: similarItems.length,
      });

      res.json({
        success: true,
        data: similarItems,
        query,
        threshold,
        totalCandidates: candidates.length,
      });

    } catch (mlError) {
      logger.error('Semantic search ML service error:', mlError);
      throw createError('Semantic search service unavailable', 503, 'SEMANTIC_SEARCH_UNAVAILABLE');
    }
  })
);

// GET /api/search/analytics - Search analytics for admin users
router.get('/analytics',
  authenticate,
  // requireRole('admin'), // Uncomment if you want to restrict to admin
  asyncHandler(async (req: Request, res: Response) => {
    const { days = 7 } = req.query;

    const analytics = await Promise.all([
      redisManager.getMetrics('search:executed', Number(days)),
      redisManager.getMetrics('search:cached', Number(days)),
      redisManager.getMetrics('search:type:claims', Number(days)),
      redisManager.getMetrics('search:type:evidence', Number(days)),
      redisManager.getMetrics('search:type:reasoning', Number(days)),
      redisManager.getMetrics('search:type:projects', Number(days)),
    ]);

    const [executed, cached, claims, evidence, reasoning, projects] = analytics;

    res.json({
      success: true,
      data: {
        searchVolume: {
          executed,
          cached,
          cacheHitRate: calculateCacheHitRate(executed, cached),
        },
        searchTypes: {
          claims,
          evidence,
          reasoning, 
          projects,
        },
        period: `${days} days`,
      },
    });
  })
);

// Helper functions
async function generateSearchFacets(query: string, projectFilter: any, user?: any) {
  try {
    const [typeFacets, statusFacets, tagFacets] = await Promise.all([
      // Type distribution
      Claim.aggregate([
        { $match: { ...projectFilter, isActive: true } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]).then(results => results.reduce((acc: any, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})),

      // Status distribution  
      Claim.aggregate([
        { $match: { ...projectFilter, isActive: true } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]).then(results => results.reduce((acc: any, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})),

      // Popular tags
      Claim.aggregate([
        { $match: { ...projectFilter, isActive: true } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    return {
      types: typeFacets,
      status: statusFacets,
      tags: tagFacets.map((tag: any) => ({
        name: tag._id,
        count: tag.count
      })),
    };
  } catch (error) {
    logger.error('Error generating search facets:', error);
    return { types: {}, status: {}, tags: [] };
  }
}

async function getRecentSearches(userId?: string) {
  if (!userId) return [];
  
  try {
    const activities = await redisManager.getUserActivity(userId);
    const searchActivities = activities
      .filter((activity: any) => activity.action === 'search')
      .slice(-5) // Last 5 searches
      .map((activity: any) => ({
        query: activity.query,
        timestamp: activity.timestamp,
        type: activity.type,
      }));

    return searchActivities;
  } catch (error) {
    logger.error('Error getting recent searches:', error);
    return [];
  }
}

function calculateCacheHitRate(executed: Record<string, number>, cached: Record<string, number>) {
  const totalExecuted = Object.values(executed).reduce((sum, count) => sum + count, 0);
  const totalCached = Object.values(cached).reduce((sum, count) => sum + count, 0);
  
  if (totalExecuted === 0) return 0;
  return (totalCached / (totalExecuted + totalCached)) * 100;
}

export default router;