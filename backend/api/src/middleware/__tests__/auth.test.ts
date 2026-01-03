/**
 * Auth Middleware Unit Tests
 * Tests authentication, authorization, and token management
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthenticatedRequest extends Omit<Request, 'user'> {
  user?: {
    id: string;
    _id?: { toString: () => string };
    email: string;
    role: string;
    name?: string;
    isActive?: boolean;
    isVerified?: boolean;
    toJSON?: () => Record<string, unknown>;
  };
}

// Mock dependencies before importing
jest.mock('jsonwebtoken');
jest.mock('../../config/redis', () => ({
  __esModule: true,
  default: {
    exists: jest.fn().mockResolvedValue(false),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    trackUserActivity: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock('../../models/Project', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

import {
  authenticate,
  optionalAuth,
  requireRole,
  requireProjectAccess,
  authenticateApiKey,
  generateToken,
  generateRefreshToken,
  refreshToken,
  logout,
} from '../auth';
import User from '../../models/User';
import Project from '../../models/Project';
import redisManager from '../../config/redis';

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  const mockUser = {
    _id: { toString: () => 'user-123' },
    id: 'user-123',
    email: 'test@example.com',
    role: 'user',
    isActive: true,
    isVerified: true,
    toJSON: () => ({ _id: 'user-123', id: 'user-123', email: 'test@example.com', role: 'user' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      headers: {},
      cookies: {},
      params: {},
      body: {},
      query: {},
      ip: '127.0.0.1',
      method: 'GET',
      path: '/api/test',
      get: jest.fn().mockReturnValue('Mozilla/5.0'),
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    // Default mocks
    (jwt.verify as jest.Mock).mockReturnValue({
      userId: 'user-123',
      email: 'test@example.com',
      role: 'user',
    });

    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });
  });

  describe('authenticate', () => {
    it('should reject request without token', async () => {
      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'TOKEN_MISSING',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should extract token from Authorization header', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' };

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', expect.any(String));
    });

    it('should extract token from cookies', async () => {
      mockReq.cookies = { token: 'cookie-token' };

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(jwt.verify).toHaveBeenCalledWith('cookie-token', expect.any(String));
    });

    it('should reject blacklisted token', async () => {
      mockReq.headers = { authorization: 'Bearer blacklisted-token' };
      (redisManager.exists as jest.Mock).mockResolvedValue(true);

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'TOKEN_BLACKLISTED',
        })
      );
    });

    it('should reject expired token', async () => {
      mockReq.headers = { authorization: 'Bearer expired-token' };
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.TokenExpiredError('Token expired', new Date());
      });

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'TOKEN_EXPIRED',
        })
      );
    });

    it('should reject invalid token', async () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token');
      });

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'TOKEN_INVALID',
        })
      );
    });

    it('should reject if user not found', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' };
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'USER_NOT_FOUND',
        })
      );
    });

    it('should reject inactive user', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' };
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({ ...mockUser, isActive: false }),
      });

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'USER_NOT_FOUND',
        })
      );
    });

    it('should attach user to request on success', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' };

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as AuthenticatedRequest).user).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should track user activity on successful auth', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' };

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(redisManager.trackUserActivity).toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should continue without token', async () => {
      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq as AuthenticatedRequest).user).toBeUndefined();
    });

    it('should attach user if valid token provided', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' };

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq as AuthenticatedRequest).user).toBeDefined();
    });

    it('should continue silently on invalid token', async () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token');
      });

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq as AuthenticatedRequest).user).toBeUndefined();
    });
  });

  describe('requireRole', () => {
    it('should reject if user not authenticated', () => {
      const middleware = requireRole('admin');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'AUTH_REQUIRED',
        })
      );
    });

    it('should allow access for user with required role', () => {
      (mockReq as AuthenticatedRequest).user ={ ...mockUser, role: 'admin' };
      const middleware = requireRole('admin');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject user without required role', () => {
      (mockReq as AuthenticatedRequest).user ={ ...mockUser, role: 'user' };
      const middleware = requireRole('admin');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'INSUFFICIENT_PERMISSIONS',
        })
      );
    });

    it('should accept array of roles', () => {
      (mockReq as AuthenticatedRequest).user ={ ...mockUser, role: 'researcher' };
      const middleware = requireRole(['admin', 'researcher']);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject if user role not in allowed array', () => {
      (mockReq as AuthenticatedRequest).user ={ ...mockUser, role: 'user' };
      const middleware = requireRole(['admin', 'researcher']);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('requireProjectAccess', () => {
    const mockProject = {
      _id: { toString: () => 'project-123' },
      owner: { _id: { toString: () => 'user-123' } },
      collaborators: [],
      visibility: 'private',
      isActive: true,
      hasPermission: jest.fn().mockReturnValue(true),
    };

    beforeEach(() => {
      (Project.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockProject),
        }),
      });
    });

    it('should reject if user not authenticated', async () => {
      const middleware = requireProjectAccess();

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'AUTH_REQUIRED',
        })
      );
    });

    it('should reject if project ID not provided', async () => {
      (mockReq as AuthenticatedRequest).user =mockUser;
      const middleware = requireProjectAccess();

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'PROJECT_ID_MISSING',
        })
      );
    });

    it('should reject if project not found', async () => {
      (mockReq as AuthenticatedRequest).user =mockUser;
      mockReq.params = { projectId: 'project-123' };
      (Project.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null),
        }),
      });

      const middleware = requireProjectAccess();

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'PROJECT_NOT_FOUND',
        })
      );
    });

    it('should allow access for project owner', async () => {
      (mockReq as AuthenticatedRequest).user =mockUser;
      mockReq.params = { projectId: 'project-123' };

      const middleware = requireProjectAccess();

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((mockReq as any).project).toBeDefined();
    });

    it('should allow access for collaborator', async () => {
      (mockReq as AuthenticatedRequest).user ={ ...mockUser, _id: { toString: () => 'collaborator-123' } };
      mockReq.params = { projectId: 'project-123' };

      const projectWithCollaborator = {
        ...mockProject,
        owner: { _id: { toString: () => 'owner-456' } },
        collaborators: [{ user: { _id: { toString: () => 'collaborator-123' } } }],
      };

      (Project.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(projectWithCollaborator),
        }),
      });

      const middleware = requireProjectAccess();

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow access to public project for any user', async () => {
      (mockReq as AuthenticatedRequest).user ={ ...mockUser, _id: { toString: () => 'random-user' } };
      mockReq.params = { projectId: 'project-123' };

      const publicProject = {
        ...mockProject,
        owner: { _id: { toString: () => 'owner-456' } },
        visibility: 'public',
      };

      (Project.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(publicProject),
        }),
      });

      const middleware = requireProjectAccess();

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access to private project for non-member', async () => {
      (mockReq as AuthenticatedRequest).user ={ ...mockUser, _id: { toString: () => 'random-user' } };
      mockReq.params = { projectId: 'project-123' };

      const privateProject = {
        ...mockProject,
        owner: { _id: { toString: () => 'owner-456' } },
        collaborators: [],
        visibility: 'private',
      };

      (Project.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(privateProject),
        }),
      });

      const middleware = requireProjectAccess();

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'PROJECT_ACCESS_DENIED',
        })
      );
    });

    it('should check specific permission if required', async () => {
      (mockReq as AuthenticatedRequest).user = { ...mockUser, id: 'collaborator-123', _id: { toString: () => 'collaborator-123' } };
      mockReq.params = { projectId: 'project-123' };

      const projectWithLimitedPermission = {
        ...mockProject,
        owner: { _id: { toString: () => 'owner-456' } },
        collaborators: [{ user: { _id: { toString: () => 'collaborator-123' } } }],
        hasPermission: jest.fn().mockReturnValue(false),
      };

      (Project.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(projectWithLimitedPermission),
        }),
      });

      const middleware = requireProjectAccess('canEdit');

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'INSUFFICIENT_PROJECT_PERMISSIONS',
        })
      );
    });

    it('should get projectId from body if not in params', async () => {
      (mockReq as AuthenticatedRequest).user =mockUser;
      mockReq.body = { projectId: 'project-123' };

      const middleware = requireProjectAccess();

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(Project.findById).toHaveBeenCalledWith('project-123');
    });

    it('should get projectId from query if not in params or body', async () => {
      (mockReq as AuthenticatedRequest).user =mockUser;
      mockReq.query = { projectId: 'project-123' };

      const middleware = requireProjectAccess();

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(Project.findById).toHaveBeenCalledWith('project-123');
    });
  });

  describe('authenticateApiKey', () => {
    const originalEnv = process.env.ML_SERVICE_API_KEY;

    beforeAll(() => {
      process.env.ML_SERVICE_API_KEY = 'valid-api-key';
    });

    afterAll(() => {
      process.env.ML_SERVICE_API_KEY = originalEnv;
    });

    it('should reject request without API key', async () => {
      await authenticateApiKey(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'API_KEY_MISSING',
        })
      );
    });

    it('should reject invalid API key', async () => {
      mockReq.headers = { 'x-api-key': 'invalid-key' };

      await authenticateApiKey(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'API_KEY_INVALID',
        })
      );
    });

    it('should accept valid API key', async () => {
      mockReq.headers = { 'x-api-key': 'valid-api-key' };

      await authenticateApiKey(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('generateToken', () => {
    it('should generate a JWT token', () => {
      (jwt.sign as jest.Mock).mockReturnValue('generated-token');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const token = generateToken(mockUser as any);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        }),
        expect.any(String),
        expect.objectContaining({
          expiresIn: expect.any(String),
          issuer: 'claim-mapper-api',
          audience: 'claim-mapper-client',
        })
      );
      expect(token).toBe('generated-token');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a refresh token', () => {
      (jwt.sign as jest.Mock).mockReturnValue('generated-refresh-token');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const token = generateRefreshToken(mockUser as any);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          type: 'refresh',
        }),
        expect.any(String),
        expect.objectContaining({
          expiresIn: expect.any(String),
        })
      );
      expect(token).toBe('generated-refresh-token');
    });
  });

  describe('refreshToken', () => {
    it('should reject request without refresh token', async () => {
      await refreshToken(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'REFRESH_TOKEN_MISSING',
        })
      );
    });

    it('should reject invalid refresh token type', async () => {
      mockReq.body = { refreshToken: 'some-token' };
      (jwt.verify as jest.Mock).mockReturnValue({
        userId: 'user-123',
        type: 'access', // Wrong type
      });

      await refreshToken(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'INVALID_REFRESH_TOKEN',
        })
      );
    });

    it('should reject if user not found', async () => {
      mockReq.body = { refreshToken: 'valid-refresh-token' };
      (jwt.verify as jest.Mock).mockReturnValue({
        userId: 'user-123',
        type: 'refresh',
      });
      (User.findById as jest.Mock).mockResolvedValue(null);

      await refreshToken(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'USER_NOT_FOUND',
        })
      );
    });

    it('should generate new tokens on success', async () => {
      mockReq.body = { refreshToken: 'valid-refresh-token' };
      (jwt.verify as jest.Mock).mockReturnValue({
        userId: 'user-123',
        type: 'refresh',
      });
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (jwt.sign as jest.Mock).mockReturnValue('new-token');

      await refreshToken(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            accessToken: 'new-token',
            refreshToken: 'new-token',
          }),
        })
      );
    });

    it('should handle expired refresh token', async () => {
      mockReq.body = { refreshToken: 'expired-token' };
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.TokenExpiredError('Token expired', new Date());
      });

      await refreshToken(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'REFRESH_TOKEN_EXPIRED',
        })
      );
    });
  });

  describe('logout', () => {
    it('should blacklist token on logout', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' };
      (jwt.decode as jest.Mock).mockReturnValue({
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      });

      await logout(mockReq as Request, mockRes as Response);

      expect(redisManager.set).toHaveBeenCalledWith(
        'blacklist:valid-token',
        'true',
        expect.any(Number)
      );
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Logged out successfully',
        })
      );
    });

    it('should handle logout without token gracefully', async () => {
      await logout(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Logged out successfully',
        })
      );
    });

    it('should not blacklist already expired token', async () => {
      mockReq.headers = { authorization: 'Bearer expired-token' };
      (jwt.decode as jest.Mock).mockReturnValue({
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      });

      await logout(mockReq as Request, mockRes as Response);

      expect(redisManager.set).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });
  });
});
