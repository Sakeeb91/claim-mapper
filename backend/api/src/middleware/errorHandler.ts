import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import redisManager from '../config/redis';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
  details?: any;
}

class ErrorHandler {
  private isDevelopment = process.env.NODE_ENV === 'development';

  // Main error handling middleware
  handle = (err: AppError, req: Request, res: Response, next: NextFunction): void => {
    let error = { ...err };
    error.message = err.message;

    // Log error
    this.logError(err, req);

    // Handle specific error types
    if (err.name === 'CastError') {
      error = this.handleCastError(err as any);
    } else if (err.name === 'ValidationError') {
      error = this.handleValidationError(err as any);
    } else if ((err as any).code === 11000) {
      error = this.handleDuplicateError(err as any);
    } else if (err.name === 'JsonWebTokenError') {
      error = this.handleJWTError();
    } else if (err.name === 'TokenExpiredError') {
      error = this.handleJWTExpiredError();
    } else if (err.name === 'MulterError') {
      error = this.handleMulterError(err as any);
    }

    // Set default error if not set
    if (!error.statusCode) {
      error.statusCode = 500;
      error.code = 'INTERNAL_SERVER_ERROR';
      error.message = 'Something went wrong';
    }

    // Send error response
    this.sendErrorResponse(error, req, res);

    // Track error metrics
    this.trackErrorMetrics(error, req);
  };

  // Handle MongoDB CastError
  private handleCastError(err: mongoose.Error.CastError): AppError {
    const message = `Invalid ${err.path}: ${err.value}`;
    return {
      name: 'CastError',
      message,
      statusCode: 400,
      code: 'INVALID_ID',
      isOperational: true,
    };
  }

  // Handle MongoDB ValidationError
  private handleValidationError(err: mongoose.Error.ValidationError): AppError {
    const errors = Object.values(err.errors).map(error => ({
      field: error.path,
      message: error.message,
      value: (error as any).value,
    }));

    return {
      name: 'ValidationError',
      message: 'Validation failed',
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      isOperational: true,
      details: { errors },
    };
  }

  // Handle MongoDB duplicate key error
  private handleDuplicateError(err: any): AppError {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `${field} '${value}' already exists`;

    return {
      name: 'DuplicateError',
      message,
      statusCode: 409,
      code: 'DUPLICATE_ENTRY',
      isOperational: true,
      details: { field, value },
    };
  }

  // Handle JWT errors
  private handleJWTError(): AppError {
    return {
      name: 'JsonWebTokenError',
      message: 'Invalid token',
      statusCode: 401,
      code: 'INVALID_TOKEN',
      isOperational: true,
    };
  }

  private handleJWTExpiredError(): AppError {
    return {
      name: 'TokenExpiredError',
      message: 'Token expired',
      statusCode: 401,
      code: 'TOKEN_EXPIRED',
      isOperational: true,
    };
  }

  // Handle Multer errors (file upload)
  private handleMulterError(err: any): AppError {
    let message = 'File upload error';
    let code = 'FILE_UPLOAD_ERROR';

    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large';
        code = 'FILE_TOO_LARGE';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files';
        code = 'TOO_MANY_FILES';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected field';
        code = 'UNEXPECTED_FILE_FIELD';
        break;
    }

    return {
      name: 'MulterError',
      message,
      statusCode: 400,
      code,
      isOperational: true,
    };
  }

  // Log error
  private logError(err: AppError, req: Request): void {
    const errorInfo = {
      message: err.message,
      name: err.name,
      stack: err.stack,
      statusCode: err.statusCode || 500,
      code: err.code,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?._id,
      timestamp: new Date().toISOString(),
    };

    if (err.statusCode && err.statusCode < 500) {
      logger.warn('Client error:', errorInfo);
    } else {
      logger.error('Server error:', errorInfo);
    }
  }

  // Send error response
  private sendErrorResponse(error: AppError, req: Request, res: Response): void {
    const response: any = {
      success: false,
      message: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString(),
    };

    // Add details in development or for client errors
    if (this.isDevelopment || (error.statusCode && error.statusCode < 500)) {
      if (error.details) {
        response.details = error.details;
      }
    }

    // Add stack trace in development
    if (this.isDevelopment) {
      response.stack = error.stack;
    }

    res.status(error.statusCode || 500).json(response);
  }

  // Track error metrics
  private async trackErrorMetrics(error: AppError, req: Request): Promise<void> {
    try {
      const errorCode = error.code || 'UNKNOWN_ERROR';
      const statusCode = error.statusCode || 500;
      const route = req.route?.path || req.path;
      const method = req.method;

      // Increment error counters
      await Promise.all([
        redisManager.incrementMetric(`errors:total`),
        redisManager.incrementMetric(`errors:${errorCode}`),
        redisManager.incrementMetric(`errors:status:${statusCode}`),
        redisManager.incrementMetric(`errors:route:${method}:${route}`),
      ]);

      // Track error by user if authenticated
      if ((req as any).user) {
        await redisManager.incrementMetric(`errors:user:${(req as any).user._id}`);
      }

    } catch (trackingError) {
      logger.error('Error tracking metrics:', trackingError);
    }
  }
}

// Create singleton instance
const errorHandlerInstance = new ErrorHandler();

// 404 handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error: AppError = {
    name: 'NotFoundError',
    message: `Route ${req.originalUrl} not found`,
    statusCode: 404,
    code: 'ROUTE_NOT_FOUND',
    isOperational: true,
  };

  next(error);
};

// Async error wrapper
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Create custom error
export const createError = (
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: any
): AppError => {
  const error: AppError = {
    name: 'AppError',
    message,
    statusCode,
    code: code || 'CUSTOM_ERROR',
    isOperational: true,
  };

  if (details) {
    error.details = details;
  }

  return error;
};

// Error handler middleware export
export const errorHandler = errorHandlerInstance.handle;
export default errorHandlerInstance.handle;