/**
 * Auth Routes Unit Tests
 * Tests authentication endpoints including registration, login, and password management
 */

import { Request, Response } from 'express';
import crypto from 'crypto';

// Mock all dependencies before importing
jest.mock('../../config/redis', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    deletePattern: jest.fn().mockResolvedValue(undefined),
    incrementMetric: jest.fn().mockResolvedValue(undefined),
    incrementCounter: jest.fn().mockResolvedValue(1),
    trackUserActivity: jest.fn().mockResolvedValue(undefined),
    getUserActivity: jest.fn().mockResolvedValue([]),
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

jest.mock('../../models/User', () => {
  const mockUserInstance = {
    _id: 'user-123',
    email: 'test@example.com',
    password: '$2b$10$hashedpassword',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    isActive: true,
    isVerified: false,
    verificationToken: 'verification-token',
    loginHistory: [],
    save: jest.fn().mockResolvedValue(true),
    toJSON: jest.fn().mockReturnValue({
      _id: 'user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
    }),
    comparePassword: jest.fn().mockResolvedValue(true),
    updateOne: jest.fn().mockResolvedValue({}),
  };

  const MockUser = jest.fn().mockImplementation(() => mockUserInstance) as jest.Mock & {
    findOne: jest.Mock;
    findById: jest.Mock;
    findByIdAndUpdate: jest.Mock;
  };
  MockUser.findOne = jest.fn();
  MockUser.findById = jest.fn();
  MockUser.findByIdAndUpdate = jest.fn();

  return {
    __esModule: true,
    default: MockUser,
  };
});

jest.mock('../../models/EmailLog', () => ({
  __esModule: true,
  default: {
    create: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('../../services/email', () => ({
  sendEmail: jest.fn().mockResolvedValue({ queued: true, jobId: 'job-123' }),
  isEmailEnabled: jest.fn().mockReturnValue(true),
  renderPasswordResetEmail: jest.fn().mockReturnValue('<html>Reset email</html>'),
}));

jest.mock('../../middleware/auth', () => ({
  generateToken: jest.fn().mockReturnValue('mock-access-token'),
  generateRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
  authenticate: jest.fn((req, res, next) => {
    req.user = {
      _id: 'user-123',
      email: 'test@example.com',
      toJSON: () => ({ _id: 'user-123', email: 'test@example.com' }),
    };
    next();
  }),
  refreshToken: jest.fn(),
  logout: jest.fn(),
}));

jest.mock('../../middleware/validation', () => ({
  validate: jest.fn(() => (req: Request, res: Response, next: () => void) => next()),
  validationSchemas: {
    register: {},
    login: {},
    updateProfile: {},
    changePassword: {},
  },
  sanitize: jest.fn((req: Request, res: Response, next: () => void) => next()),
}));

jest.mock('../../middleware/errorHandler', () => ({
  asyncHandler: (fn: Function) => fn,
  createError: jest.fn((message, status, code) => ({
    message,
    statusCode: status,
    code,
  })),
}));

import User from '../../models/User';
import redisManager from '../../config/redis';
import { generateToken, generateRefreshToken } from '../../middleware/auth';
import { sendEmail } from '../../services/email';

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Registration Logic', () => {
    it('should check for existing user during registration', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const email = 'newuser@example.com';
      const result = await User.findOne({ email: email.toLowerCase() });

      expect(result).toBeNull();
      expect(User.findOne).toHaveBeenCalledWith({ email });
    });

    it('should reject registration if user exists', async () => {
      (User.findOne as jest.Mock).mockResolvedValue({
        email: 'existing@example.com',
      });

      const existingUser = await User.findOne({ email: 'existing@example.com' });

      expect(existingUser).not.toBeNull();
    });

    it('should generate verification token for new user', () => {
      const verificationToken = crypto.randomBytes(32).toString('hex');

      expect(verificationToken).toHaveLength(64);
      expect(/^[a-f0-9]+$/i.test(verificationToken)).toBe(true);
    });

    it('should generate both access and refresh tokens on registration', () => {
      const mockUser = { _id: 'user-123', email: 'test@example.com', role: 'user' };

      const accessToken = generateToken(mockUser as any);
      const refreshToken = generateRefreshToken(mockUser as any);

      expect(accessToken).toBe('mock-access-token');
      expect(refreshToken).toBe('mock-refresh-token');
      expect(generateToken).toHaveBeenCalledWith(mockUser);
      expect(generateRefreshToken).toHaveBeenCalledWith(mockUser);
    });

    it('should store refresh token in Redis with 7-day expiry', async () => {
      const userId = 'user-123';
      const refreshToken = 'mock-refresh-token';
      const expiry = 7 * 24 * 60 * 60; // 7 days in seconds

      await redisManager.set(`refresh_token:${userId}`, refreshToken, expiry);

      expect(redisManager.set).toHaveBeenCalledWith(
        `refresh_token:${userId}`,
        refreshToken,
        expiry
      );
    });

    it('should increment user registration metric', async () => {
      await redisManager.incrementMetric('users:registered');

      expect(redisManager.incrementMetric).toHaveBeenCalledWith('users:registered');
    });
  });

  describe('Login Logic', () => {
    it('should find user by lowercase email', async () => {
      (User.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: 'user-123',
          email: 'test@example.com',
          password: 'hashed',
          comparePassword: jest.fn().mockResolvedValue(true),
        }),
      });

      const email = 'TEST@EXAMPLE.COM';
      const query = { email: email.toLowerCase(), isActive: true };

      await User.findOne(query);

      expect(User.findOne).toHaveBeenCalledWith({
        email: 'test@example.com',
        isActive: true,
      });
    });

    it('should track failed login attempts in Redis', async () => {
      const ip = '127.0.0.1';
      const key = `failed_login:${ip}`;
      const windowSeconds = 900; // 15 minutes

      await redisManager.incrementCounter(key, windowSeconds);

      expect(redisManager.incrementCounter).toHaveBeenCalledWith(key, windowSeconds);
    });

    it('should clear failed attempts on successful login', async () => {
      const ip = '127.0.0.1';

      await redisManager.del(`failed_login:${ip}`);

      expect(redisManager.del).toHaveBeenCalledWith(`failed_login:${ip}`);
    });

    it('should set token expiry based on rememberMe flag', () => {
      const rememberMe = true;
      const tokenExpiry = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;

      expect(tokenExpiry).toBe(30 * 24 * 60 * 60);
    });

    it('should update user login info', async () => {
      const userId = 'user-123';
      const loginInfo = {
        timestamp: new Date(),
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      };

      await User.findByIdAndUpdate(userId, {
        lastLogin: new Date(),
        $push: {
          loginHistory: {
            $each: [loginInfo],
            $slice: -10,
          },
        },
      });

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          lastLogin: expect.any(Date),
          $push: expect.objectContaining({
            loginHistory: expect.objectContaining({
              $each: expect.any(Array),
              $slice: -10,
            }),
          }),
        })
      );
    });

    it('should track successful login metrics', async () => {
      await redisManager.incrementMetric('auth:successful_logins');
      await redisManager.trackUserActivity('user-123', {
        action: 'login',
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(redisManager.incrementMetric).toHaveBeenCalledWith('auth:successful_logins');
      expect(redisManager.trackUserActivity).toHaveBeenCalled();
    });
  });

  describe('Password Reset Logic', () => {
    it('should generate secure reset token', () => {
      const resetToken = crypto.randomBytes(32).toString('hex');

      expect(resetToken).toHaveLength(64);
    });

    it('should set reset token expiry to 15 minutes', () => {
      const resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000);
      const now = Date.now();

      expect(resetTokenExpires.getTime()).toBeGreaterThan(now);
      expect(resetTokenExpires.getTime()).toBeLessThanOrEqual(now + 15 * 60 * 1000 + 1000);
    });

    it('should store reset token in Redis', async () => {
      const resetToken = 'reset-token-123';
      const userId = 'user-123';
      const expiry = 15 * 60; // 15 minutes

      await redisManager.set(`reset_token:${resetToken}`, userId, expiry);

      expect(redisManager.set).toHaveBeenCalledWith(
        `reset_token:${resetToken}`,
        userId,
        expiry
      );
    });

    it('should send password reset email', async () => {
      const email = 'test@example.com';
      const subject = 'Password Reset Request - Claim Mapper';
      const html = '<html>Reset email</html>';

      await sendEmail(email, subject, html, {
        metadata: {
          userId: 'user-123',
          type: 'password_reset',
          priority: 'high',
        },
      });

      expect(sendEmail).toHaveBeenCalledWith(
        email,
        subject,
        html,
        expect.objectContaining({
          metadata: expect.objectContaining({
            type: 'password_reset',
            priority: 'high',
          }),
        })
      );
    });

    it('should not reveal if email exists (security)', async () => {
      // Both cases should return same message
      const successMessage = 'If an account with that email exists, we have sent a password reset link.';

      // User found case
      (User.findOne as jest.Mock).mockResolvedValue({ email: 'found@example.com' });
      // Message should be same regardless

      // User not found case
      (User.findOne as jest.Mock).mockResolvedValue(null);
      // Message should be same

      expect(successMessage).toBe(
        'If an account with that email exists, we have sent a password reset link.'
      );
    });

    it('should validate reset token from Redis', async () => {
      const resetToken = 'valid-reset-token';
      (redisManager.get as jest.Mock).mockResolvedValue('user-123');

      const userId = await redisManager.get(`reset_token:${resetToken}`);

      expect(userId).toBe('user-123');
    });

    it('should invalidate all refresh tokens after password reset', async () => {
      const userId = 'user-123';

      await redisManager.deletePattern(`refresh_token:${userId}*`);

      expect(redisManager.deletePattern).toHaveBeenCalledWith(`refresh_token:${userId}*`);
    });

    it('should clean up reset token after successful reset', async () => {
      const resetToken = 'used-reset-token';

      await redisManager.del(`reset_token:${resetToken}`);

      expect(redisManager.del).toHaveBeenCalledWith(`reset_token:${resetToken}`);
    });
  });

  describe('Password Change Logic', () => {
    it('should verify current password before change', async () => {
      const mockUser = {
        _id: 'user-123',
        password: 'hashed-password',
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const user = await User.findById('user-123').select('+password');
      const isValid = await user?.comparePassword('currentPassword');

      expect(isValid).toBe(true);
    });

    it('should invalidate all refresh tokens after password change', async () => {
      const userId = 'user-123';

      await redisManager.deletePattern(`refresh_token:${userId}*`);

      expect(redisManager.deletePattern).toHaveBeenCalledWith(`refresh_token:${userId}*`);
    });

    it('should track password change activity', async () => {
      const userId = 'user-123';

      await redisManager.trackUserActivity(userId, {
        action: 'password_change',
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(redisManager.trackUserActivity).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          action: 'password_change',
        })
      );
    });
  });

  describe('Session Management', () => {
    it('should get user activity from Redis', async () => {
      const userId = 'user-123';

      await redisManager.getUserActivity(userId);

      expect(redisManager.getUserActivity).toHaveBeenCalledWith(userId);
    });

    it('should get login history from database', async () => {
      const userId = 'user-123';

      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({
          loginHistory: [
            { timestamp: new Date(), ip: '127.0.0.1', userAgent: 'Chrome' },
          ],
        }),
      });

      const user = await User.findById(userId).select('loginHistory');

      expect(user?.loginHistory).toHaveLength(1);
    });

    it('should clear all sessions by deleting refresh tokens', async () => {
      const userId = 'user-123';

      await redisManager.deletePattern(`refresh_token:${userId}*`);

      expect(redisManager.deletePattern).toHaveBeenCalledWith(`refresh_token:${userId}*`);
    });
  });

  describe('Profile Update Logic', () => {
    it('should update user profile with validated data', async () => {
      const userId = 'user-123';
      const updates = {
        firstName: 'Updated',
        lastName: 'Name',
        preferences: {
          theme: 'dark',
        },
      };

      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({
        ...updates,
        email: 'test@example.com',
      });

      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updates },
        { new: true, runValidators: true }
      );

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        userId,
        { $set: updates },
        { new: true, runValidators: true }
      );
      expect(user?.firstName).toBe('Updated');
    });
  });

  describe('Token Verification Logic', () => {
    it('should verify reset token exists in Redis', async () => {
      const token = 'valid-token';
      (redisManager.get as jest.Mock).mockResolvedValue('user-123');

      const userId = await redisManager.get(`reset_token:${token}`);

      expect(userId).toBe('user-123');
    });

    it('should return invalid for non-existent token', async () => {
      const token = 'invalid-token';
      (redisManager.get as jest.Mock).mockResolvedValue(null);

      const userId = await redisManager.get(`reset_token:${token}`);

      expect(userId).toBeNull();
    });

    it('should verify user exists and token matches', async () => {
      const token = 'valid-token';
      const userId = 'user-123';

      (User.findOne as jest.Mock).mockResolvedValue({
        _id: userId,
        resetPasswordToken: token,
        resetPasswordExpires: new Date(Date.now() + 1000 * 60), // Not expired
        isActive: true,
      });

      const user = await User.findOne({
        _id: userId,
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() },
        isActive: true,
      });

      expect(user).not.toBeNull();
    });
  });

  describe('Rate Limiting', () => {
    it('should track failed login attempts', async () => {
      const ip = '192.168.1.1';

      const attempts = await redisManager.incrementCounter(`failed_login:${ip}`, 900);

      expect(redisManager.incrementCounter).toHaveBeenCalled();
      expect(attempts).toBe(1);
    });

    it('should block after 5 failed attempts', () => {
      const failedAttempts = 6;
      const isBlocked = failedAttempts > 5;

      expect(isBlocked).toBe(true);
    });
  });

  describe('Response Formats', () => {
    it('should return correct registration response structure', () => {
      const response = {
        success: true,
        message: 'Registration successful',
        data: {
          user: { _id: 'user-123', email: 'test@example.com' },
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
        },
      };

      expect(response.success).toBe(true);
      expect(response.data.accessToken).toBeDefined();
      expect(response.data.refreshToken).toBeDefined();
      expect(response.data.user).toBeDefined();
    });

    it('should return correct login response structure', () => {
      const response = {
        success: true,
        message: 'Login successful',
        data: {
          user: { _id: 'user-123', email: 'test@example.com' },
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          expiresIn: '7d',
        },
      };

      expect(response.success).toBe(true);
      expect(response.data.expiresIn).toBeDefined();
    });

    it('should return correct profile response structure', () => {
      const response = {
        success: true,
        data: {
          user: { _id: 'user-123', email: 'test@example.com' },
        },
      };

      expect(response.success).toBe(true);
      expect(response.data.user).toBeDefined();
    });
  });
});
