import express from 'express';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User';
import { generateToken, generateRefreshToken, authenticate, refreshToken, logout } from '../middleware/auth';
import { validate, validationSchemas, sanitize } from '../middleware/validation';
import { asyncHandler, createError } from '../middleware/errorHandler';
import redisManager from '../config/redis';
import { logger } from '../utils/logger';

const router = express.Router();

// POST /api/auth/register - User registration
router.post('/register',
  sanitize,
  validate(validationSchemas.register),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, firstName, lastName, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw createError('User already exists with this email', 409, 'USER_EXISTS');
    }

    // Create new user
    const user = new User({
      email: email.toLowerCase(),
      password, // Will be hashed by pre-save middleware
      firstName,
      lastName,
      role: role || 'user',
      verificationToken: crypto.randomBytes(32).toString('hex'),
    });

    await user.save();

    // Generate tokens
    const accessToken = generateToken(user);
    const refreshTokenValue = generateRefreshToken(user);

    // Store refresh token in Redis
    await redisManager.set(
      `refresh_token:${user._id}`,
      refreshTokenValue,
      7 * 24 * 60 * 60 // 7 days
    );

    // Update user stats
    await redisManager.incrementMetric('users:registered');

    logger.info(`New user registered: ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: user.toJSON(),
        accessToken,
        refreshToken: refreshTokenValue,
      },
    });
  })
);

// POST /api/auth/login - User login
router.post('/login',
  sanitize,
  validate(validationSchemas.login),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, rememberMe } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      isActive: true 
    }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      // Track failed login attempt
      await redisManager.incrementMetric('auth:failed_logins');
      
      // Rate limit failed attempts
      const failedKey = `failed_login:${req.ip}`;
      const failedAttempts = await redisManager.incrementCounter(failedKey, 900); // 15 minutes
      
      if (failedAttempts > 5) {
        throw createError('Too many failed login attempts. Try again later.', 429, 'RATE_LIMIT_EXCEEDED');
      }
      
      throw createError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Clear failed attempts on successful login
    await redisManager.del(`failed_login:${req.ip}`);

    // Generate tokens
    const accessToken = generateToken(user);
    const refreshTokenValue = generateRefreshToken(user);
    const tokenExpiry = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60; // 30 days or 7 days

    // Store refresh token in Redis
    await redisManager.set(
      `refresh_token:${user._id}`,
      refreshTokenValue,
      tokenExpiry
    );

    // Update user login info
    const loginInfo = {
      timestamp: new Date(),
      ip: req.ip,
      userAgent: req.get('User-Agent') || 'Unknown',
    };

    await User.findByIdAndUpdate(user._id, {
      lastLogin: new Date(),
      $push: {
        loginHistory: {
          $each: [loginInfo],
          $slice: -10, // Keep only last 10 login records
        },
      },
    });

    // Track successful login
    await redisManager.incrementMetric('auth:successful_logins');
    await redisManager.trackUserActivity(user._id.toString(), {
      action: 'login',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    logger.info(`User logged in: ${user.email}`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        accessToken,
        refreshToken: refreshTokenValue,
        expiresIn: rememberMe ? '30d' : '7d',
      },
    });
  })
);

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', refreshToken);

// POST /api/auth/logout - User logout
router.post('/logout', authenticate, logout);

// GET /api/auth/me - Get current user info
router.get('/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        user: req.user!.toJSON(),
      },
    });
  })
);

// PUT /api/auth/profile - Update user profile
router.put('/profile',
  authenticate,
  sanitize,
  validate(validationSchemas.updateProfile),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id;
    const updates = req.body;

    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    logger.info(`User profile updated: ${user.email}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: user.toJSON(),
      },
    });
  })
);

// PUT /api/auth/password - Change password
router.put('/password',
  authenticate,
  sanitize,
  validate(validationSchemas.changePassword),
  asyncHandler(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!._id;

    // Get user with password
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Verify current password
    if (!(await user.comparePassword(currentPassword))) {
      throw createError('Current password is incorrect', 400, 'INVALID_PASSWORD');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Invalidate all existing refresh tokens for this user
    await redisManager.deletePattern(`refresh_token:${userId}*`);
    
    // Track password change
    await redisManager.trackUserActivity(userId.toString(), {
      action: 'password_change',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    logger.info(`Password changed for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  })
);

// POST /api/auth/forgot-password - Forgot password request
router.post('/forgot-password',
  sanitize,
  validate(validationSchemas.login.fork(['password'], (schema) => schema.forbidden())),
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    const user = await User.findOne({ 
      email: email.toLowerCase(),
      isActive: true 
    });

    if (!user) {
      // Don't reveal if user exists
      res.json({
        success: true,
        message: 'If an account with that email exists, we have sent a password reset link.',
      });
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save reset token
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpires;
    await user.save();

    // Store reset token in Redis for quick lookup
    await redisManager.set(`reset_token:${resetToken}`, user._id.toString(), 15 * 60); // 15 minutes

    // TODO: Send email with reset link
    // const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    // await sendResetEmail(user.email, resetUrl);

    logger.info(`Password reset requested for user: ${user.email}`);

    res.json({
      success: true,
      message: 'If an account with that email exists, we have sent a password reset link.',
    });
  })
);

// GET /api/auth/sessions - Get active sessions
router.get('/sessions',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    
    // Get user activity from Redis
    const activities = await redisManager.getUserActivity(userId);
    
    // Get recent login history from database
    const user = await User.findById(userId).select('loginHistory');
    
    res.json({
      success: true,
      data: {
        recentActivity: activities.slice(-10), // Last 10 activities
        loginHistory: user?.loginHistory || [],
      },
    });
  })
);

// DELETE /api/auth/sessions - Logout from all devices
router.delete('/sessions',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    
    // Clear all refresh tokens for this user
    await redisManager.deletePattern(`refresh_token:${userId}*`);
    
    logger.info(`All sessions invalidated for user: ${req.user!.email}`);
    
    res.json({
      success: true,
      message: 'Logged out from all devices',
    });
  })
);

export default router;