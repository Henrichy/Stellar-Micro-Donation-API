const {
  TRANSACTION_STATES,
  VALID_TRANSITIONS,
  normalizeState,
  canTransition,
  assertValidState,
  assertValidTransition,
} = require('../../src/utils/transactionStateMachine');

describe('Transaction State Machine', () => {
  test('should normalize legacy states', () => {
    expect(normalizeState('completed')).toBe(TRANSACTION_STATES.CONFIRMED);
    expect(normalizeState('cancelled')).toBe(TRANSACTION_STATES.FAILED);
  });

  test('should normalize null/undefined to PENDING', () => {
    expect(normalizeState(null)).toBe(TRANSACTION_STATES.PENDING);
    expect(normalizeState(undefined)).toBe(TRANSACTION_STATES.PENDING);
    expect(normalizeState('')).toBe(TRANSACTION_STATES.PENDING);
  });

  test('should validate known states', () => {
    expect(() => assertValidState(TRANSACTION_STATES.PENDING)).not.toThrow();
    expect(() => assertValidState(TRANSACTION_STATES.SUBMITTED)).not.toThrow();
    expect(() => assertValidState(TRANSACTION_STATES.CONFIRMED)).not.toThrow();
    expect(() => assertValidState(TRANSACTION_STATES.FAILED)).not.toThrow();
  });

  test('should reject unknown states', () => {
    expect(() => assertValidState('cancelled')).toThrow('Invalid transaction state');
    expect(() => assertValidState('processing')).toThrow('Invalid transaction state');
  });

  test('VALID_TRANSITIONS is exported and data-driven', () => {
    expect(VALID_TRANSITIONS).toBeDefined();
    expect(VALID_TRANSITIONS[TRANSACTION_STATES.PENDING]).toBeInstanceOf(Set);
    expect(VALID_TRANSITIONS[TRANSACTION_STATES.FAILED].size).toBe(0);
  });

  describe('should allow valid transitions', () => {
    const legalTransitions = [
      ['pending',   'submitted'],
      ['pending',   'confirmed'],
      ['pending',   'failed'],
      ['submitted', 'confirmed'],
      ['submitted', 'failed'],
      ['confirmed', 'failed'],
    ];

    test.each(legalTransitions)('%s → %s', (from, to) => {
      expect(canTransition(from, to)).toBe(true);
      expect(() => assertValidTransition(from, to)).not.toThrow();
    });
  });

  describe('should block invalid transitions', () => {
    const illegalTransitions = [
      ['failed',    'confirmed'],
      ['failed',    'submitted'],
      ['failed',    'pending'],
      ['confirmed', 'pending'],
      ['confirmed', 'submitted'],
      ['submitted', 'pending'],
    ];

    test.each(illegalTransitions)('%s → %s is blocked', (from, to) => {
      expect(canTransition(from, to)).toBe(false);
      expect(() => assertValidTransition(from, to)).toThrow('Invalid transaction state transition');
    });
  });

  test('identity transitions (same state) are allowed', () => {
    for (const state of Object.values(TRANSACTION_STATES)) {
      expect(canTransition(state, state)).toBe(true);
    }
  });
});
