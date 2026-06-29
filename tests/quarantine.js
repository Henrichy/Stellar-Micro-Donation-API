/**
 * Quarantined Tests Registry
 *
 * Tracks flaky tests that are known to pass/fail intermittently.
 * Each entry maps a test to an issue for tracking resolution.
 *
 * Format:
 * 'test-file-pattern': {
 *   issue: '#XXXX',
 *   owner: 'username',
 *   reason: 'brief description',
 *   addedDate: 'YYYY-MM-DD',
 *   deadline: 'YYYY-MM-DD',
 * }
 */

module.exports = {
  // Example (remove when issues are fixed):
  // 'tests/scheduler-resilience.test.js': {
  //   issue: '#9999',
  //   owner: 'team-member',
  //   reason: 'Intermittent race condition in scheduler state',
  //   addedDate: '2026-06-29',
  //   deadline: '2026-07-15',
  // },
};
