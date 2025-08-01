import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import redisManager from './config/redis';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { sanitize } from './middleware/validation';

// Routes
import authRoutes from './routes/auth';
import claimRoutes from './routes/claims';
import projectRoutes from './routes/projects';
import evidenceRoutes from './routes/evidence';
import reasoningRoutes from './routes/reasoning';
import graphRoutes from './routes/graph';
import searchRoutes from './routes/search';
import collaborationRoutes from './routes/collaboration';

// WebSocket handlers
import { setupWebSocketHandlers } from './websocket/handlers';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

const PORT = process.env.PORT || 8000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isDevelopment = NODE_ENV === 'development';

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: isDevelopment ? false : undefined,
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:3001', // For development
    ];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || isDevelopment) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'X-API-Key'],
}));

// Rate limiting - More granular approach
const createRateLimiter = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message,
      code: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Custom key generator to use Redis for distributed rate limiting
    keyGenerator: (req) => {
      return req.ip || 'unknown';
    },
  });
};

// Different rate limits for different endpoints
app.use('/api/auth/login', createRateLimiter(15 * 60 * 1000, 5, 'Too many login attempts'));
app.use('/api/auth/register', createRateLimiter(60 * 60 * 1000, 3, 'Too many registration attempts'));
app.use('/api/', createRateLimiter(15 * 60 * 1000, 1000, 'Too many requests from this IP'));

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store raw body for webhook verification if needed
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Compression and logging
app.use(compression());
app.use(morgan(
  isDevelopment ? 'dev' : 'combined',
  { 
    stream: { 
      write: (message) => logger.info(message.trim()) 
    },
    skip: (req) => req.url === '/health' // Skip health check logs
  }
));

// Global input sanitization
app.use(sanitize);

// Health check endpoint with comprehensive status
app.get('/health', async (req, res) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: 'unknown',
      redis: 'unknown',
      mlService: 'unknown',
    },
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
  };

  try {
    // Check database connection
    const mongoose = await import('mongoose');
    healthCheck.services.database = mongoose.default.connection.readyState === 1 ? 'healthy' : 'unhealthy';
  } catch (error) {
    healthCheck.services.database = 'error';
  }

  try {
    // Check Redis connection
    const isRedisHealthy = await redisManager.ping();
    healthCheck.services.redis = isRedisHealthy ? 'healthy' : 'unhealthy';
  } catch (error) {
    healthCheck.services.redis = 'error';
  }

  try {
    // Check ML service
    const axios = await import('axios');
    const response = await axios.default.get(`${process.env.ML_SERVICE_URL}/health`, {
      timeout: 2000,
      headers: { 'X-API-Key': process.env.ML_SERVICE_API_KEY }
    });
    healthCheck.services.mlService = response.status === 200 ? 'healthy' : 'unhealthy';
  } catch (error) {
    healthCheck.services.mlService = 'unhealthy';
  }

  const isHealthy = Object.values(healthCheck.services).every(status => 
    status === 'healthy' || status === 'unknown'
  );

  res.status(isHealthy ? 200 : 503).json(healthCheck);
});

// API Documentation endpoint (in development)
if (isDevelopment) {
  app.get('/api', (req, res) => {
    res.json({
      name: 'Claim Mapper API',
      version: '1.0.0',
      description: 'Backend API for the Claim Mapping System',
      endpoints: {
        auth: '/api/auth',
        projects: '/api/projects',
        claims: '/api/claims',
        evidence: '/api/evidence',
        reasoning: '/api/reasoning',
        graph: '/api/graph',
        search: '/api/search',
        collaboration: '/api/collaboration',
      },
      documentation: 'https://docs.claimmapper.com',
      support: 'support@claimmapper.com',
    });
  });
}

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/reasoning', reasoningRoutes);
app.use('/api/graph', graphRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/collaboration', collaborationRoutes);

// WebSocket setup
setupWebSocketHandlers(io);

// 404 handler for API routes
app.use('/api/*', notFoundHandler);

// Default route for non-API requests
app.get('/', (req, res) => {
  res.json({
    message: 'Claim Mapper API is running',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Catch-all 404 handler
app.use('*', notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown handler
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  // Close server
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      // Close database connections
      const mongoose = await import('mongoose');
      await mongoose.default.connection.close();
      logger.info('Database connection closed');
      
      // Close Redis connection
      await redisManager.disconnect();
      logger.info('Redis connection closed');
      
      // Close WebSocket connections
      io.close(() => {
        logger.info('WebSocket server closed');
      });
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forceful shutdown after timeout');
    process.exit(1);
  }, 30000);
}

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Start server
async function startServer() {
  try {
    // Connect to databases
    await connectDatabase();
    await redisManager.connect();
    
    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📋 Environment: ${NODE_ENV}`);
      logger.info(`🔗 WebSocket server enabled`);
      logger.info(`🛡️  Security middleware enabled`);
      logger.info(`📊 Rate limiting active`);
      
      if (isDevelopment) {
        logger.info(`📚 API Documentation: http://localhost:${PORT}/api`);
        logger.info(`🏥 Health Check: http://localhost:${PORT}/health`);
      }
    });
    
    // Track server startup
    await redisManager.incrementMetric('server:startups');
    
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Initialize server
startServer();

export default app;
export { io, server };