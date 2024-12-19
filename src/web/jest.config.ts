// @ts-check
// jest.config.ts
// Version: Jest ^29.0.0
// Dependencies:
// - @testing-library/jest-dom ^5.16.5
// - @swc/jest ^0.2.24

import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  // Use jsdom environment for browser-like testing
  testEnvironment: 'jsdom',

  // Define root directories for tests and source files
  roots: ['<rootDir>/src', '<rootDir>/tests'],

  // Module name mapping for path aliases and static assets
  moduleNameMapper: {
    // Path aliases matching tsconfig paths
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@styles/(.*)$': '<rootDir>/src/styles/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@api/(.*)$': '<rootDir>/src/api/$1',
    '^@interfaces/(.*)$': '<rootDir>/src/interfaces/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',

    // Handle static assets
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/tests/__mocks__/fileMock.js',
  },

  // Setup files to run before tests
  setupFilesAfterEnv: [
    '@testing-library/jest-dom'
  ],

  // Transform configuration for TypeScript and other files
  transform: {
    // Use SWC for faster TypeScript/JavaScript transformation
    '^.+\\.(t|j)sx?$': ['@swc/jest'],
    '^.+\\.svg$': 'jest-transform-stub'
  },

  // Test file patterns
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$',

  // File extensions to consider
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [
    'text',     // Console output
    'lcov',     // For CI integration
    'html'      // HTML report for detailed viewing
  ],

  // Coverage thresholds enforcing minimum coverage percentages
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Paths to ignore for coverage
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/dist/',
    '/coverage/'
  ],

  // Paths to ignore for testing
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],

  // Watch plugins for improved developer experience
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],

  // Verbose output for detailed test results
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Maximum number of concurrent workers
  maxWorkers: '50%',

  // Detect open handles for async operations
  detectOpenHandles: true,

  // Error handling
  bail: 1,
  errorOnDeprecated: true,

  // Timing configuration
  testTimeout: 10000,
  slowTestThreshold: 5000,
};

export default config;