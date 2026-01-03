/**
 * Test utilities and helper functions for backend API tests
 * Provides factory functions, mock generators, and common test setup
 */

import mongoose from 'mongoose';

// Generate a valid MongoDB ObjectId
export const generateObjectId = (): string => {
  return new mongoose.Types.ObjectId().toHexString();
};

// Create multiple ObjectIds
export const generateObjectIds = (count: number): string[] => {
  return Array.from({ length: count }, () => generateObjectId());
};

// Create a mock Express request
export const createMockRequest = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  headers: {},
  params: {},
  query: {},
  body: {},
  ip: '127.0.0.1',
  get: jest.fn((header: string) => {
    const headers: Record<string, string> = {
      'User-Agent': 'Test-Agent/1.0',
      'Content-Type': 'application/json',
    };
    return headers[header] || '';
  }),
  cookies: {},
  ...overrides,
});

// Create a mock Express response
export const createMockResponse = (): Record<string, jest.Mock> => {
  const res: Record<string, jest.Mock> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

// Create a mock next function
export const createMockNext = (): jest.Mock => jest.fn();

// Wait for async operations to complete
export const waitForAsync = (ms: number = 0): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// Create a mock JWT token
export const createMockToken = (userId: string = generateObjectId()): string => {
  return `mock-jwt-token-${userId}`;
};

// Regex patterns for common validations
export const patterns = {
  objectId: /^[0-9a-fA-F]{24}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  url: /^https?:\/\/.+/,
};

// Common test data
export const testData = {
  emails: {
    valid: 'test@example.com',
    invalid: 'not-an-email',
  },
  passwords: {
    strong: 'StrongP@ss123!',
    weak: 'password',
    short: 'Ab1!',
  },
  objectIds: {
    valid: '507f1f77bcf86cd799439011',
    invalid: 'not-a-valid-id',
  },
};

// Assertion helpers
export const expectSuccessResponse = (response: Record<string, unknown>): void => {
  expect(response.success).toBe(true);
  expect(response.data).toBeDefined();
};

export const expectErrorResponse = (
  response: Record<string, unknown>,
  statusCode: number,
  code?: string
): void => {
  expect(response.success).toBe(false);
  expect(response.message).toBeDefined();
  if (code) {
    expect(response.code).toBe(code);
  }
};
