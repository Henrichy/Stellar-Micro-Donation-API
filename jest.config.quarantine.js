/**
 * Jest Configuration for Quarantined Tests
 *
 * Runs only flaky tests that have been quarantined and are under investigation.
 * These tests run with retries to tolerate transient failures during fixes.
 *
 * Usage: jest --config jest.config.quarantine.js
 */

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.quarantine.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/scripts/**',
    '!src/config/**',
  ],
  coverageReporters: ['text', 'text-summary', 'lcov', 'html', 'json-summary'],
  coverageDirectory: 'coverage',
  verbose: true,
  testTimeout: 10000,
  maxWorkers: '50%',
  workerIdleMemoryLimit: '512MB',
  setupFiles: ['<rootDir>/tests/setup.js'],
  globalSetup: '<rootDir>/tests/globalSetup.js',
  // Quarantined tests tolerate transient failures
  // Run with bounded retries (3 attempts per test)
  testRetryTimes: 3,
};
