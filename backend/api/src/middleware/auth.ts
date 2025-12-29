import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import Project from '../models/Project';
import redisManager from '../config/redis';
import { logger } from '../utils/logger';

// Extend Express Request type to include user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: IUser;
      project?: any;
    }
  }
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

class AuthMiddleware {
  private jwtSecret: string;
  private jwtExpiry: string;
  private refreshTokenExpiry: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'claim-mapper-secret-key';
    this.jwtExpiry = process.env.JWT_EXPIRY || '24h';
    this.refreshTokenExpiry = process.env.REFRESH_TOKEN_EXPIRY || '7d';
  }

  // Main authentication middleware
  authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = this.extractToken(req);
      
      if (!token) {
        res.status(401).json({
          success: false,
          message: 'Access token required',
          code: 'TOKEN_MISSING'
        });
        return;
      }

      // Check if token is blacklisted
      const isBlacklisted = await redisManager.exists(`blacklist:${token}`);
      if (isBlacklisted) {
        res.status(401).json({
          success: false,
          message: 'Token is invalid',
          code: 'TOKEN_BLACKLISTED'
        });
        return;
      }

      // Verify JWT token
      const decoded = jwt.verify(token, this.jwtSecret) as JWTPayload;
      
      // Get user from database
      const user = await User.findById(decoded.userId).select('+password');
      if (!user || !user.isActive) {
        res.status(401).json({
          success: false,
          message: 'User not found or inactive',
          code: 'USER_NOT_FOUND'
        });
        return;
      }

      // Check if user account is verified for sensitive operations
      if (!user.isVerified && this.requiresVerification(req)) {
        res.status(403).json({
          success: false,
          message: 'Account verification required',
          code: 'ACCOUNT_NOT_VERIFIED'
        });
        return;
      }

      // Update last activity
      await this.updateUserActivity(user._id.toString(), req);

      req.user = user;
      next();

    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          message: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
        return;
      }

      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          success: false,
          message: 'Invalid token',
          code: 'TOKEN_INVALID'
        });
        return;
      }

      logger.error('Authentication error:', error);
      res.status(500).json({
        success: false,
        message: 'Authentication failed',
        code: 'AUTH_ERROR'
      });
    }
  };

  // Optional authentication (doesn't fail if no token)
  optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = this.extractToken(req);
      
      if (!token) {
        next();
        return;
      }

      const decoded = jwt.verify(token, this.jwtSecret) as JWTPayload;
      const user = await User.findById(decoded.userId);
      
      if (user && user.isActive) {
        req.user = user;
        await this.updateUserActivity(user._id.toString(), req);
      }

    } catch (error) {
      // Silently fail for optional auth
      logger.debug('Optional auth failed:', error);
    }
    
    next();
  };

  // Role-based authorization
  requireRole = (roles: string | string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      
      if (!allowedRoles.includes(req.user.role)) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: allowedRoles,
          current: req.user.role
        });
        return;
      }

      next();
    };
  };

  // Project-based authorization
  requireProjectAccess = (permission?: string) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          res.status(401).json({
            success: false,
            message: 'Authentication required',
            code: 'AUTH_REQUIRED'
          });
          return;
        }

        const projectId = req.params.projectId || req.body.projectId || req.query.projectId;
        
        if (!projectId) {
          res.status(400).json({
            success: false,
            message: 'Project ID required',
            code: 'PROJECT_ID_MISSING'
          });
          return;
        }

        const project = await Project.findById(projectId)
          .populate('owner', 'firstName lastName email')
          .populate('collaborators.user', 'firstName lastName email');

        if (!project || !project.isActive) {
          res.status(404).json({
            success: false,
            message: 'Project not found',
            code: 'PROJECT_NOT_FOUND'
          });
          return;
        }

        // Check if user has access to project
        const userId = req.user._id.toString();
        const isOwner = project.owner._id.toString() === userId;
        const collaborator = project.collaborators.find(c => 
          c.user._id.toString() === userId
        );

        if (!isOwner && !collaborator && project.visibility !== 'public') {
          res.status(403).json({
            success: false,
            message: 'Access denied to project',
            code: 'PROJECT_ACCESS_DENIED'
          });
          return;
        }

        // Check specific permission if required
        if (permission && !isOwner) {
          if (!collaborator || !project.hasPermission(userId, permission)) {
            res.status(403).json({
              success: false,
              message: `Permission '${permission}' required`,
              code: 'INSUFFICIENT_PROJECT_PERMISSIONS'
            });
            return;
          }
        }

        req.project = project;
        next();

      } catch (error) {
        logger.error('Project authorization error:', error);
        res.status(500).json({
          success: false,
          message: 'Authorization failed',
          code: 'AUTH_ERROR'
        });
      }
    };
  };

  // API Key authentication for ML service integration
  authenticateApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const apiKey = req.headers['x-api-key'] as string;
      
      if (!apiKey) {
        res.status(401).json({
          success: false,
          message: 'API key required',
          code: 'API_KEY_MISSING'
        });
        return;
      }

      // Check if API key is valid (in production, store hashed keys in database)
      const validApiKey = process.env.ML_SERVICE_API_KEY;
      
      if (apiKey !== validApiKey) {
        res.status(401).json({
          success: false,
          message: 'Invalid API key',
          code: 'API_KEY_INVALID'
        });
        return;
      }

      next();

    } catch (error) {
      logger.error('API key authentication error:', error);
      res.status(500).json({
        success: false,
        message: 'API key authentication failed',
        code: 'API_AUTH_ERROR'
      });
    }
  };

  // Generate JWT token
  generateToken = (user: IUser): string => {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload as object, this.jwtSecret, {
      expiresIn: this.jwtExpiry,
      issuer: 'claim-mapper-api',
      audience: 'claim-mapper-client',
    });
  };

  // Generate refresh token
  generateRefreshToken = (user: IUser): string => {
    const payload = {
      userId: user._id.toString(),
      type: 'refresh',
    };

    return jwt.sign(payload as object, this.jwtSecret, {
      expiresIn: this.refreshTokenExpiry,
      issuer: 'claim-mapper-api',
      audience: 'claim-mapper-client',
    });
  };

  // Refresh token endpoint
  refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Refresh token required',
          code: 'REFRESH_TOKEN_MISSING'
        });
        return;
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.jwtSecret) as any;
      
      if (decoded.type !== 'refresh') {
        res.status(401).json({
          success: false,
          message: 'Invalid refresh token',
          code: 'INVALID_REFRESH_TOKEN'
        });
        return;
      }

      // Get user
      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        res.status(401).json({
          success: false,
          message: 'User not found or inactive',
          code: 'USER_NOT_FOUND'
        });
        return;
      }

      // Generate new tokens
      const newAccessToken = this.generateToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      res.json({
        success: true,
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          user: user.toJSON(),
        },
      });

    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          message: 'Refresh token expired',
          code: 'REFRESH_TOKEN_EXPIRED'
        });
        return;
      }

      logger.error('Token refresh error:', error);
      res.status(500).json({
        success: false,
        message: 'Token refresh failed',
        code: 'REFRESH_ERROR'
      });
    }
  };

  // Logout (blacklist token)
  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      const token = this.extractToken(req);
      
      if (token) {
        // Add token to blacklist with remaining TTL
        const decoded = jwt.decode(token) as any;
        const remainingTTL = decoded.exp - Math.floor(Date.now() / 1000);
        
        if (remainingTTL > 0) {
          await redisManager.set(`blacklist:${token}`, 'true', remainingTTL);
        }
      }

      res.json({
        success: true,
        message: 'Logged out successfully',
      });

    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        code: 'LOGOUT_ERROR'
      });
    }
  };

  // Extract token from request
  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // Also check for token in cookies
    return req.cookies?.token || null;
  }

  // Check if route requires verification
  private requiresVerification(req: Request): boolean {
    const sensitiveRoutes = [
      '/api/projects',
      '/api/claims',
      '/api/evidence',
      '/api/reasoning',
    ];
    
    return sensitiveRoutes.some(route => req.path.startsWith(route)) &&
           ['POST', 'PUT', 'DELETE'].includes(req.method);
  }

  // Update user activity
  private async updateUserActivity(userId: string, req: Request): Promise<void> {
    try {
      const activity = {
        action: `${req.method} ${req.path}`,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date(),
      };

      await redisManager.trackUserActivity(userId, activity);

      // Update last login in database periodically
      const lastUpdateKey = `last_activity_update:${userId}`;
      const lastUpdate = await redisManager.get<number>(lastUpdateKey);
      const now = Date.now();

      if (!lastUpdate || (now - (lastUpdate as number)) > 300000) { // 5 minutes
        await User.findByIdAndUpdate(userId, { 
          lastLogin: new Date(),
          $push: {
            loginHistory: {
              $each: [{
                timestamp: new Date(),
                ip: req.ip,
                userAgent: req.get('User-Agent') || 'Unknown',
              }],
              $slice: -10, // Keep only last 10 login records
            },
          },
        });
        
        await redisManager.set(lastUpdateKey, now, 300); // 5 minutes cache
      }

    } catch (error) {
      logger.error('Error updating user activity:', error);
    }
  }
}

// Create singleton instance
const authMiddleware = new AuthMiddleware();

// Export individual middleware functions
export const authenticate = authMiddleware.authenticate;
export const optionalAuth = authMiddleware.optionalAuth;
export const requireRole = authMiddleware.requireRole;
export const requireProjectAccess = authMiddleware.requireProjectAccess;
export const authenticateApiKey = authMiddleware.authenticateApiKey;
export const generateToken = authMiddleware.generateToken;
export const generateRefreshToken = authMiddleware.generateRefreshToken;
export const refreshToken = authMiddleware.refreshToken;
export const logout = authMiddleware.logout;

export default authMiddleware;