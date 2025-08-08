// Jest setup file for backend API tests

// Increase timeout for database operations
jest.setTimeout(30000)

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

// Console override to reduce noise in test output
const originalConsole = { ...console }
beforeAll(() => {
  console.log = jest.fn()
  console.info = jest.fn()
  console.warn = jest.fn()
  // Keep console.error for debugging failed tests
  // console.error = jest.fn()
})

afterAll(() => {
  Object.assign(console, originalConsole)
})

// Clean up after each test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks()
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})