/**
 * Error Handler Middleware Unit Tests
 * Tests error handling, status codes, and error response formatting
 */

import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

// Mock dependencies
jest.mock('../../config/redis', () => ({
  __esModule: true,
  default: {
    incrementMetric: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  createError,
  AppError,
} from '../errorHandler';
import redisManager from '../../config/redis';
import { logger } from '../../utils/logger';

describe('Error Handler Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      originalUrl: '/api/test',
      method: 'GET',
      path: '/api/test',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('Mozilla/5.0'),
      route: { path: '/test' },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('errorHandler', () => {
    it('should handle generic errors with 500 status', () => {
      const error = new Error('Something went wrong');

      errorHandler(error as AppError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'INTERNAL_SERVER_ERROR',
        })
      );
    });

    it('should preserve error status code if set', () => {
      const error: AppError = {
        name: 'CustomError',
        message: 'Custom error message',
        statusCode: 403,
        code: 'FORBIDDEN',
      };

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Custom error message',
          code: 'FORBIDDEN',
        })
      );
    });

    it('should handle MongoDB CastError', () => {
      const error = {
        name: 'CastError',
        path: '_id',
        value: 'invalid-id',
      } as mongoose.Error.CastError;

      errorHandler(error as unknown as AppError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'INVALID_ID',
        })
      );
    });

    it('should handle MongoDB ValidationError', () => {
      const error = {
        name: 'ValidationError',
        errors: {
          email: {
            path: 'email',
            message: 'Email is required',
            value: undefined,
          },
          password: {
            path: 'password',
            message: 'Password is too short',
            value: 'abc',
          },
        },
      } as unknown as mongoose.Error.ValidationError;

      errorHandler(error as unknown as AppError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
        })
      );
    });

    it('should handle MongoDB duplicate key error (code 11000)', () => {
      const error = {
        name: 'MongoError',
        code: 11000,
        keyValue: { email: 'test@example.com' },
      };

      errorHandler(error as unknown as AppError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'DUPLICATE_ENTRY',
        })
      );
    });

    it('should handle JsonWebTokenError', () => {
      // Create a mock error with the same structure as JsonWebTokenError
      const error = Object.assign(new Error('Invalid token'), {
        name: 'JsonWebTokenError',
      });

      errorHandler(error as unknown as AppError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid token',
          code: 'INVALID_TOKEN',
        })
      );
    });

    it('should handle TokenExpiredError', () => {
      // Create a mock error with the same structure as TokenExpiredError
      const error = Object.assign(new Error('Token expired'), {
        name: 'TokenExpiredError',
        expiredAt: new Date(),
      });

      errorHandler(error as unknown as AppError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Token expired',
          code: 'TOKEN_EXPIRED',
        })
      );
    });

    it('should handle MulterError for file size', () => {
      const error = {
        name: 'MulterError',
        code: 'LIMIT_FILE_SIZE',
      };

      errorHandler(error as unknown as AppError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'FILE_TOO_LARGE',
        })
      );
    });

    it('should handle MulterError for file count', () => {
      const error = {
        name: 'MulterError',
        code: 'LIMIT_FILE_COUNT',
      };

      errorHandler(error as unknown as AppError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'TOO_MANY_FILES',
        })
      );
    });

    it('should handle MulterError for unexpected field', () => {
      const error = {
        name: 'MulterError',
        code: 'LIMIT_UNEXPECTED_FILE',
      };

      errorHandler(error as unknown as AppError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'UNEXPECTED_FILE_FIELD',
        })
      );
    });

    it('should log client errors (4xx) with warn level', () => {
      const error: AppError = {
        name: 'ClientError',
        message: 'Bad request',
        statusCode: 400,
      };

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(logger.warn).toHaveBeenCalledWith(
        'Client error:',
        expect.objectContaining({
          statusCode: 400,
        })
      );
    });

    it('should log server errors (5xx) with error level', () => {
      const error: AppError = {
        name: 'ServerError',
        message: 'Internal error',
        statusCode: 500,
      };

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        'Server error:',
        expect.objectContaining({
          statusCode: 500,
        })
      );
    });

    it('should track error metrics', async () => {
      const error: AppError = {
        name: 'TestError',
        message: 'Test error',
        statusCode: 400,
        code: 'TEST_ERROR',
      };

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(redisManager.incrementMetric).toHaveBeenCalledWith('errors:total');
      expect(redisManager.incrementMetric).toHaveBeenCalledWith('errors:TEST_ERROR');
      expect(redisManager.incrementMetric).toHaveBeenCalledWith('errors:status:400');
    });

    it('should include stack trace in development mode', () => {
      process.env.NODE_ENV = 'development';

      const error = new Error('Development error');

      errorHandler(error as AppError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: expect.any(String),
        })
      );
    });

    it('should not include stack trace in production mode', () => {
      process.env.NODE_ENV = 'production';

      const error = new Error('Production error');

      errorHandler(error as AppError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.not.objectContaining({
          stack: expect.any(String),
        })
      );
    });

    it('should include details for client errors', () => {
      const error: AppError = {
        name: 'ValidationError',
        message: 'Validation failed',
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        details: { field: 'email', issue: 'invalid format' },
      };

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: { field: 'email', issue: 'invalid format' },
        })
      );
    });

    it('should include user ID in error log if authenticated', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockReq as any).user = { _id: 'user-123' };

      const error = new Error('Error with user');

      errorHandler(error as AppError, mockReq as Request, mockRes as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        'Server error:',
        expect.objectContaining({
          userId: 'user-123',
        })
      );
    });

    it('should include timestamp in error response', () => {
      const error = new Error('Error with timestamp');

      errorHandler(error as AppError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('notFoundHandler', () => {
    it('should create 404 error for unknown routes', () => {
      mockReq.originalUrl = '/api/unknown-route';

      notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          code: 'ROUTE_NOT_FOUND',
          message: expect.stringContaining('/api/unknown-route'),
        })
      );
    });

    it('should include original URL in error message', () => {
      mockReq.originalUrl = '/api/v1/users/123/settings';

      notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('/api/v1/users/123/settings'),
        })
      );
    });
  });

  describe('asyncHandler', () => {
    it('should call the wrapped async function', async () => {
      const mockAsyncFn = jest.fn().mockResolvedValue(undefined);
      const wrapped = asyncHandler(mockAsyncFn);

      wrapped(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockAsyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    });

    it('should pass errors to next on rejection', async () => {
      const error = new Error('Async error');
      const mockAsyncFn = jest.fn().mockRejectedValue(error);
      const wrapped = asyncHandler(mockAsyncFn);

      wrapped(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should not call next on success', async () => {
      const mockAsyncFn = jest.fn().mockResolvedValue({ data: 'test' });
      const wrapped = asyncHandler(mockAsyncFn);

      wrapped(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 0));

      // next should not be called with error
      expect(mockNext).not.toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle synchronous errors', async () => {
      const error = new Error('Sync error');
      const mockSyncFn = jest.fn().mockImplementation(() => {
        throw error;
      });
      const wrapped = asyncHandler(mockSyncFn);

      wrapped(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('createError', () => {
    it('should create error with default values', () => {
      const error = createError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('CUSTOM_ERROR');
      expect(error.isOperational).toBe(true);
    });

    it('should create error with custom status code', () => {
      const error = createError('Not found', 404);

      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
    });

    it('should create error with custom code', () => {
      const error = createError('Forbidden', 403, 'ACCESS_DENIED');

      expect(error.code).toBe('ACCESS_DENIED');
    });

    it('should create error with details', () => {
      const error = createError('Validation failed', 400, 'VALIDATION_ERROR', {
        field: 'email',
        value: 'invalid',
      });

      expect(error.details).toEqual({
        field: 'email',
        value: 'invalid',
      });
    });

    it('should mark error as operational', () => {
      const error = createError('User error');

      expect(error.isOperational).toBe(true);
    });
  });

  describe('error codes consistency', () => {
    it('should use consistent error codes for common scenarios', () => {
      // Test common error scenarios produce expected codes
      const notFoundError = createError('Resource not found', 404, 'RESOURCE_NOT_FOUND');
      expect(notFoundError.statusCode).toBe(404);
      expect(notFoundError.code).toBe('RESOURCE_NOT_FOUND');

      const authError = createError('Authentication required', 401, 'AUTH_REQUIRED');
      expect(authError.statusCode).toBe(401);
      expect(authError.code).toBe('AUTH_REQUIRED');

      const forbiddenError = createError('Access denied', 403, 'ACCESS_DENIED');
      expect(forbiddenError.statusCode).toBe(403);
      expect(forbiddenError.code).toBe('ACCESS_DENIED');

      const validationError = createError('Invalid input', 400, 'VALIDATION_ERROR');
      expect(validationError.statusCode).toBe(400);
      expect(validationError.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('error metric tracking', () => {
    it('should track error by route', async () => {
      mockReq.route = { path: '/users/:id' };
      mockReq.method = 'DELETE';

      const error = createError('Delete failed', 500);

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(redisManager.incrementMetric).toHaveBeenCalledWith(
        expect.stringContaining('errors:route:DELETE:')
      );
    });

    it('should track error by user if authenticated', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockReq as any).user = { _id: 'user-456' };

      const error = createError('User error', 400);

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(redisManager.incrementMetric).toHaveBeenCalledWith('errors:user:user-456');
    });
  });

  describe('edge cases', () => {
    it('should handle error without message', () => {
      const error = {} as AppError;

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Something went wrong',
        })
      );
    });

    it('should handle error with empty message', () => {
      const error = { message: '' } as AppError;

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Something went wrong',
        })
      );
    });

    it('should handle null error object gracefully', () => {
      // Some edge cases might pass null/undefined
      const error = null as unknown as AppError;

      expect(() => {
        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      }).not.toThrow();
    });
  });
});
