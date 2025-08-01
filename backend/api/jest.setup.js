// Jest setup file for backend API tests
const { MongoMemoryServer } = require('mongodb-memory-server')
const mongoose = require('mongoose')
const Redis = require('ioredis')

// Global test configuration
global.testConfig = {
  mongodb: null,
  redisClient: null,
}

// Increase timeout for database operations
jest.setTimeout(30000)

// Mock external services
jest.mock('@/services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
  sendVerificationEmail: jest.fn().mockResolvedValue({ success: true }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true }),
}))

// Mock file upload service
jest.mock('@/services/uploadService', () => ({
  uploadFile: jest.fn().mockResolvedValue({
    filename: 'test-file.txt',
    path: '/uploads/test-file.txt',
    size: 1024,
  }),
  deleteFile: jest.fn().mockResolvedValue({ success: true }),
}))

// Mock external APIs
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
}))

// Mock JWT for consistent testing
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock-jwt-token'),
  verify: jest.fn(() => ({
    userId: 'test-user-id',
    email: 'test@example.com',
    role: 'user',
  })),
  decode: jest.fn(() => ({
    userId: 'test-user-id',
    email: 'test@example.com',
    role: 'user',
  })),
}))

// Mock bcrypt for faster tests
jest.mock('bcryptjs', () => ({
  hash: jest.fn(() => Promise.resolve('$2b$10$hashedpassword')),
  compare: jest.fn(() => Promise.resolve(true)),
  genSalt: jest.fn(() => Promise.resolve('$2b$10$salt')),
}))

// Mock Winston logger to avoid log output during tests
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    colorize: jest.fn(),
    simple: jest.fn(),
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn(),
  },
}))

// Utility functions for tests
global.testUtils = {
  // Create test user
  createTestUser: async (userData = {}) => {
    const User = require('@/models/User')
    const defaultUser = {
      email: 'test@example.com',
      password: '$2b$10$hashedpassword',
      name: 'Test User',
      isVerified: true,
      role: 'user',
      ...userData,
    }
    return await User.create(defaultUser)
  },

  // Create test claim
  createTestClaim: async (claimData = {}, userId = null) => {
    const Claim = require('@/models/Claim')
    const defaultClaim = {
      title: 'Test Claim',
      description: 'This is a test claim',
      content: 'Test claim content',
      type: 'claim',
      confidence: 0.8,
      tags: ['test'],
      author: userId || 'test-user-id',
      isPublic: true,
      ...claimData,
    }
    return await Claim.create(defaultClaim)
  },

  // Create test evidence
  createTestEvidence: async (evidenceData = {}, userId = null) => {
    const Evidence = require('@/models/Evidence')
    const defaultEvidence = {
      title: 'Test Evidence',
      description: 'This is test evidence',
      content: 'Test evidence content',
      type: 'statistical',
      source: 'Test Source',
      reliability: 0.9,
      author: userId || 'test-user-id',
      ...evidenceData,
    }
    return await Evidence.create(defaultEvidence)
  },

  // Create JWT token for testing
  createTestToken: (payload = {}) => {
    const defaultPayload = {
      userId: 'test-user-id',
      email: 'test@example.com',
      role: 'user',
      ...payload,
    }
    return 'Bearer mock-jwt-token'
  },

  // Clean database collections
  cleanDatabase: async () => {
    if (mongoose.connection.readyState === 1) {
      const collections = await mongoose.connection.db.collections()
      for (const collection of collections) {
        await collection.deleteMany({})
      }
    }
  },

  // Delay utility for async tests
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
}

// Console override to reduce noise in test output
const originalConsole = { ...console }
beforeAll(() => {
  console.log = jest.fn()
  console.info = jest.fn()
  console.warn = jest.fn()
  console.error = jest.fn()
})

afterAll(() => {
  Object.assign(console, originalConsole)
})

// Clean up after each test
afterEach(async () => {
  // Clear all mocks
  jest.clearAllMocks()
  
  // Clean database
  if (global.testUtils && global.testUtils.cleanDatabase) {
    await global.testUtils.cleanDatabase()
  }
  
  // Clear Redis cache if available
  if (global.testConfig && global.testConfig.redisClient) {
    try {
      await global.testConfig.redisClient.flushall()
    } catch (error) {
      // Ignore Redis errors in tests
    }
  }
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})