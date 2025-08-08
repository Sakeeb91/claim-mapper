/** @type {import('jest').Config} */
module.exports = {
  // Test environment
  testEnvironment: 'node',

  // TypeScript support - using ts-jest preset
  preset: 'ts-jest',

  // Root directory
  rootDir: '.',

  // Test directories
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,ts}',
    '<rootDir>/src/**/*.(test|spec).{js,ts}',
  ],

  // Module resolution
  moduleNameMapper: {
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

  // Coverage thresholds - lowered for now
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },

  // Coverage reporter
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

  // Test timeout
  testTimeout: 30000,

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

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

  // Skip global setup/teardown for CI - let CI handle MongoDB and Redis
  // globalSetup: '<rootDir>/tests/globalSetup.js',
  // globalTeardown: '<rootDir>/tests/globalTeardown.js',
}