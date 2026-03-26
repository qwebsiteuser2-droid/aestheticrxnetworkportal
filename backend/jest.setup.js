// Jest setup file for backend tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-characters-long-for-testing';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-characters-long-for-testing';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db';
process.env.BCRYPT_SALT_ROUNDS = '10'; // Lower for faster tests

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

