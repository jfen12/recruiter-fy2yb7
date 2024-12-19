// jest.config.ts
// Jest configuration for RefactorTrack backend monorepo
// @version jest ^29.0.0
// @version ts-jest ^29.0.0

import type { Config } from 'jest';
import { compilerOptions } from './tsconfig.json';

const jestConfig: Config = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',

  // Set Node.js as the test environment
  testEnvironment: 'node',

  // Define test file locations
  roots: ['<rootDir>/services'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx)',
    '**/?(*.)+(spec|test).+(ts|tsx)'
  ],

  // TypeScript transformation configuration
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },

  // Module path aliases matching tsconfig
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/$1',
    '@shared/(.*)': '<rootDir>/services/shared/$1'
  },

  // Test setup configuration
  setupFilesAfterEnv: [
    '<rootDir>/services/shared/tests/setup.ts'
  ],

  // Coverage configuration
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [
    'text',
    'lcov',
    'json-summary'
  ],

  // Coverage thresholds as per requirements (80%)
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Files to include in coverage analysis
  collectCoverageFrom: [
    'services/**/*.{ts,tsx}',
    '!services/**/*.d.ts',
    '!services/**/index.ts',
    '!services/**/*.test.{ts,tsx}',
    '!services/**/*.spec.{ts,tsx}',
    '!services/**/tests/**/*',
    '!services/**/node_modules/**'
  ],

  // Additional configuration options
  verbose: true,
  testTimeout: 30000,
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js', 
    'jsx',
    'json'
  ],

  // TypeScript configuration for ts-jest
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json'
    }
  }
};

export default jestConfig;