/**
 * Validation Middleware Unit Tests
 * Tests input validation, sanitization, and custom validators
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

// Mock dependencies
jest.mock('../../config/redis', () => ({
  __esModule: true,
  default: {
    incrementCounter: jest.fn().mockResolvedValue(1),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import {
  validate,
  validationSchemas,
  sanitize,
  sanitizeInput,
  validateFile,
  isValidObjectId,
  isValidEmail,
  isStrongPassword,
  validateRateLimit,
} from '../validation';
import redisManager from '../../config/redis';

describe('Validation Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      query: {},
      params: {},
      ip: '127.0.0.1',
      path: '/api/test',
      file: undefined,
      files: undefined,
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('validate middleware factory', () => {
    describe('with register schema', () => {
      const middleware = validate(validationSchemas.register);

      it('should pass valid registration data', () => {
        mockReq.body = {
          email: 'test@example.com',
          password: 'StrongP@ss1!',
          firstName: 'John',
          lastName: 'Doe',
        };

        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });

      it('should reject invalid email', () => {
        mockReq.body = {
          email: 'not-an-email',
          password: 'StrongP@ss1!',
          firstName: 'John',
          lastName: 'Doe',
        };

        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            code: 'VALIDATION_ERROR',
          })
        );
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject weak password', () => {
        mockReq.body = {
          email: 'test@example.com',
          password: 'weak',
          firstName: 'John',
          lastName: 'Doe',
        };

        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject password without special character', () => {
        mockReq.body = {
          email: 'test@example.com',
          password: 'WeakPass123',
          firstName: 'John',
          lastName: 'Doe',
        };

        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });

      it('should reject short firstName', () => {
        mockReq.body = {
          email: 'test@example.com',
          password: 'StrongP@ss1!',
          firstName: 'J',
          lastName: 'Doe',
        };

        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });

      it('should reject missing required fields', () => {
        mockReq.body = {
          email: 'test@example.com',
        };

        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({ field: 'password' }),
              expect.objectContaining({ field: 'firstName' }),
              expect.objectContaining({ field: 'lastName' }),
            ]),
          })
        );
      });

      it('should strip unknown fields', () => {
        mockReq.body = {
          email: 'test@example.com',
          password: 'StrongP@ss1!',
          firstName: 'John',
          lastName: 'Doe',
          unknownField: 'should be stripped',
        };

        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.body.unknownField).toBeUndefined();
      });

      it('should set default role to user', () => {
        mockReq.body = {
          email: 'test@example.com',
          password: 'StrongP@ss1!',
          firstName: 'John',
          lastName: 'Doe',
        };

        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockReq.body.role).toBe('user');
      });
    });

    describe('with createClaim schema', () => {
      const middleware = validate(validationSchemas.createClaim);

      it('should pass valid claim data', () => {
        mockReq.body = {
          text: 'This is a test claim with sufficient length',
          type: 'assertion',
          source: { type: 'manual' },
          confidence: 0.85,
          position: { start: 0, end: 50 },
        };

        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should reject claim text less than 10 characters', () => {
        mockReq.body = {
          text: 'Short',
          type: 'assertion',
          source: { type: 'manual' },
          confidence: 0.85,
          position: { start: 0, end: 5 },
        };

        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });

      it('should reject invalid claim type', () => {
        mockReq.body = {
          text: 'This is a test claim with sufficient length',
          type: 'invalid_type',
          source: { type: 'manual' },
          confidence: 0.85,
          position: { start: 0, end: 50 },
        };

        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });

      it('should reject confidence outside 0-1 range', () => {
        mockReq.body = {
          text: 'This is a test claim with sufficient length',
          type: 'assertion',
          source: { type: 'manual' },
          confidence: 1.5,
          position: { start: 0, end: 50 },
        };

        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });
    });

    describe('with objectId schema for params', () => {
      // Create a proper object schema for params that has an 'id' field
      const objectIdParamsSchema = Joi.object({
        id: validationSchemas.objectId.required(),
      });
      const middleware = validate(objectIdParamsSchema, 'params');

      it('should pass valid ObjectId', () => {
        mockReq.params = { id: '507f1f77bcf86cd799439011' };

        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should reject invalid ObjectId', () => {
        mockReq.params = { id: 'invalid-id' };

        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });
    });

    describe('with pagination schema for query', () => {
      const middleware = validate(validationSchemas.pagination, 'query');

      it('should pass valid pagination params', () => {
        mockReq.query = { page: '1', limit: '20' };

        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should set default values', () => {
        mockReq.query = {};

        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockReq.query.page).toBe(1);
        expect(mockReq.query.limit).toBe(20);
        expect(mockReq.query.order).toBe('desc');
      });

      it('should reject page less than 1', () => {
        mockReq.query = { page: '0' };

        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });

      it('should reject limit greater than 100', () => {
        mockReq.query = { limit: '101' };

        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });
    });
  });

  describe('sanitize middleware', () => {
    it('should sanitize body', () => {
      mockReq.body = {
        text: '<script>alert("xss")</script>Hello',
      };

      sanitize(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.text).not.toContain('<script>');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should sanitize query', () => {
      mockReq.query = {
        search: 'javascript:alert("xss")',
      };

      sanitize(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.query.search).not.toContain('javascript:');
    });

    it('should sanitize params', () => {
      mockReq.params = {
        id: '<img onerror="alert(1)">',
      };

      sanitize(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.params.id).not.toContain('onerror');
    });

    it('should trim string values', () => {
      mockReq.body = {
        text: '  hello world  ',
      };

      sanitize(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.text).toBe('hello world');
    });
  });

  describe('sanitizeInput function', () => {
    it('should remove script tags', () => {
      const input = '<script>malicious()</script>safe content';
      const result = sanitizeInput(input);

      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
      expect(result).toContain('safe content');
    });

    it('should remove javascript: URLs', () => {
      const input = 'javascript:alert("xss")';
      const result = sanitizeInput(input);

      expect(result).not.toContain('javascript:');
    });

    it('should remove event handlers', () => {
      const input = '<img onerror="alert(1)" onclick="evil()">';
      const result = sanitizeInput(input);

      expect(result).not.toContain('onerror');
      expect(result).not.toContain('onclick');
    });

    it('should handle arrays', () => {
      const input = [
        '<script>bad</script>',
        'javascript:evil()',
        'safe',
      ];
      const result = sanitizeInput(input);

      expect(result[0]).not.toContain('<script>');
      expect(result[1]).not.toContain('javascript:');
      expect(result[2]).toBe('safe');
    });

    it('should handle nested objects', () => {
      const input = {
        outer: {
          inner: '<script>nested</script>',
        },
      };
      const result = sanitizeInput(input);

      expect(result.outer.inner).not.toContain('<script>');
    });

    it('should preserve non-string values', () => {
      const input = {
        number: 42,
        boolean: true,
        nullValue: null,
      };
      const result = sanitizeInput(input);

      expect(result.number).toBe(42);
      expect(result.boolean).toBe(true);
      expect(result.nullValue).toBeNull();
    });
  });

  describe('validateFile middleware', () => {
    it('should pass when file is not required and not provided', () => {
      const middleware = validateFile({ required: false });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject when file is required but not provided', () => {
      const middleware = validateFile({ required: true });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'FILE_REQUIRED',
        })
      );
    });

    it('should reject file exceeding max size', () => {
      mockReq.file = {
        size: 100 * 1024 * 1024, // 100MB
        mimetype: 'application/pdf',
      } as Express.Multer.File;

      const middleware = validateFile({
        maxSize: 50 * 1024 * 1024, // 50MB
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'FILE_TOO_LARGE',
        })
      );
    });

    it('should reject disallowed file type', () => {
      mockReq.file = {
        size: 1024,
        mimetype: 'application/exe',
      } as Express.Multer.File;

      const middleware = validateFile({
        allowedTypes: ['application/pdf', 'text/plain'],
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'FILE_TYPE_NOT_ALLOWED',
        })
      );
    });

    it('should pass valid file', () => {
      mockReq.file = {
        size: 1024,
        mimetype: 'application/pdf',
      } as Express.Multer.File;

      const middleware = validateFile({
        maxSize: 50 * 1024 * 1024,
        allowedTypes: ['application/pdf'],
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle files from array upload', () => {
      mockReq.files = {
        document: [
          {
            size: 1024,
            mimetype: 'application/pdf',
          } as Express.Multer.File,
        ],
      };

      const middleware = validateFile({
        fieldName: 'document',
        allowedTypes: ['application/pdf'],
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('isValidObjectId', () => {
    it('should return true for valid ObjectId', () => {
      expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
    });

    it('should return false for invalid ObjectId', () => {
      expect(isValidObjectId('invalid')).toBe(false);
      expect(isValidObjectId('12345')).toBe(false);
      expect(isValidObjectId('')).toBe(false);
      expect(isValidObjectId('507f1f77bcf86cd79943901g')).toBe(false); // Contains 'g'
    });

    it('should handle case insensitivity', () => {
      expect(isValidObjectId('507F1F77BCF86CD799439011')).toBe(true);
      expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
    });
  });

  describe('isValidEmail', () => {
    it('should return true for valid emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.org')).toBe(true);
      expect(isValidEmail('user+tag@example.co.uk')).toBe(true);
    });

    it('should return false for invalid emails', () => {
      expect(isValidEmail('not-an-email')).toBe(false);
      expect(isValidEmail('@nodomain.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('spaces in@email.com')).toBe(false);
    });
  });

  describe('isStrongPassword', () => {
    it('should return true for strong passwords', () => {
      expect(isStrongPassword('StrongP@ss1!')).toBe(true);
      expect(isStrongPassword('MyS3cur3P@ss!')).toBe(true);
      expect(isStrongPassword('C0mpl3x!Pass')).toBe(true);
    });

    it('should return false for weak passwords', () => {
      expect(isStrongPassword('weak')).toBe(false); // Too short
      expect(isStrongPassword('alllowercase1!')).toBe(false); // No uppercase
      expect(isStrongPassword('ALLUPPERCASE1!')).toBe(false); // No lowercase
      expect(isStrongPassword('NoNumbers!!')).toBe(false); // No numbers
      expect(isStrongPassword('NoSpecial123')).toBe(false); // No special char
    });
  });

  describe('validateRateLimit middleware', () => {
    it('should allow requests under limit', async () => {
      (redisManager.incrementCounter as jest.Mock).mockResolvedValue(1);

      const middleware = validateRateLimit(60000, 10); // 1 min, 10 requests

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '9',
        })
      );
    });

    it('should reject requests over limit', async () => {
      (redisManager.incrementCounter as jest.Mock).mockResolvedValue(11);

      const middleware = validateRateLimit(60000, 10);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'RATE_LIMIT_EXCEEDED',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should set correct remaining count', async () => {
      (redisManager.incrementCounter as jest.Mock).mockResolvedValue(5);

      const middleware = validateRateLimit(60000, 10);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Remaining': '5',
        })
      );
    });

    it('should continue on Redis errors', async () => {
      (redisManager.incrementCounter as jest.Mock).mockRejectedValue(new Error('Redis error'));

      const middleware = validateRateLimit(60000, 10);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('validation schemas', () => {
    describe('login schema', () => {
      const middleware = validate(validationSchemas.login);

      it('should pass valid login data', () => {
        mockReq.body = {
          email: 'test@example.com',
          password: 'password123',
        };

        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should default rememberMe to false', () => {
        mockReq.body = {
          email: 'test@example.com',
          password: 'password123',
        };

        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockReq.body.rememberMe).toBe(false);
      });
    });

    describe('createProject schema', () => {
      const middleware = validate(validationSchemas.createProject);

      it('should pass valid project data', () => {
        mockReq.body = {
          name: 'My Project',
          type: 'research',
        };

        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should reject invalid project type', () => {
        mockReq.body = {
          name: 'My Project',
          type: 'invalid_type',
        };

        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });

      it('should reject name less than 3 characters', () => {
        mockReq.body = {
          name: 'AB',
          type: 'research',
        };

        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });
    });

    describe('createEvidence schema', () => {
      const middleware = validate(validationSchemas.createEvidence);

      it('should pass valid evidence data', () => {
        mockReq.body = {
          projectId: '507f1f77bcf86cd799439011',
          text: 'This is evidence text with sufficient length',
          type: 'empirical',
          source: {
            type: 'document',
            reference: 'Test Reference 2024',
          },
          reliability: {
            score: 0.85,
            factors: {
              sourceCredibility: 0.9,
              methodologyQuality: 0.8,
              replication: 0.7,
              peerReview: true,
              biasAssessment: 0.85,
            },
          },
          relevance: {
            score: 0.9,
          },
        };

        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should reject invalid evidence type', () => {
        mockReq.body = {
          projectId: '507f1f77bcf86cd799439011',
          text: 'This is evidence text with sufficient length',
          type: 'invalid_type',
          source: { type: 'document', reference: 'ref' },
          reliability: { score: 0.8, factors: {} },
          relevance: { score: 0.8 },
        };

        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });
    });

    describe('relateClaimsRequest schema', () => {
      const middleware = validate(validationSchemas.relateClaimsRequest);

      it('should pass valid relate claims data', () => {
        mockReq.body = {
          claimIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
          relationship: 'supports',
          confidence: 0.8,
        };

        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should reject with only one claimId', () => {
        mockReq.body = {
          claimIds: ['507f1f77bcf86cd799439011'],
          relationship: 'supports',
          confidence: 0.8,
        };

        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });

      it('should reject invalid relationship', () => {
        mockReq.body = {
          claimIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
          relationship: 'invalid',
          confidence: 0.8,
        };

        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });
    });
  });
});
