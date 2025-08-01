/** @type {import('jest').Config} */
module.exports = {
  // Test environment
  testEnvironment: 'node',

  // TypeScript support
  preset: 'ts-jest',

  // Root directory
  rootDir: '.',

  // Test directories
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,ts}',
    '<rootDir>/src/**/*.(test|spec).{js,ts}',
    '<rootDir>/tests/**/*.{js,ts}',
  ],

  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/index.ts',
    '!src/server.ts',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },

  // Coverage reporter
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

  // Test timeout
  testTimeout: 30000,

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // MongoDB Memory Server preset
  preset: '@shelf/jest-mongodb',

  // Transform configuration
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
  ],

  // Force exit after tests
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true,

  // Maximum worker processes
  maxWorkers: 1, // Use single worker for integration tests to avoid conflicts

  // Verbose output
  verbose: true,

  // Global setup and teardown
  globalSetup: '<rootDir>/tests/globalSetup.js',
  globalTeardown: '<rootDir>/tests/globalTeardown.js',
}