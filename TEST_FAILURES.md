# Test Suite Issues

## Status
CI workflow is correctly configured and running tests on every PR. Tests are failing due to code issues, not CI configuration.

## Failing Tests Summary

### 1. Missing Dependencies (7 test files)
- `sql.js` module not found
- Affects: scheduler, idempotency, validation-middleware, wallet-analytics-integration, permission-integration tests

**Fix**: Install missing dependency or remove unused code
```bash
npm install sql.js
```

### 2. Test Expectations Mismatch (68 failures)
- Tests expect recipients to be funded before donations
- MockStellarService now enforces Stellar's minimum balance requirement
- Tests use invalid public keys (wrong format/length)

**Fix**: Update tests to fund recipient accounts first
```javascript
await stellarService.fundTestnetWallet(recipient.publicKey);
```

### 3. Jest Mock API Issues (20 failures)
- `jest.fn().resolves()` and `jest.fn().rejects()` not available
- Likely Jest version incompatibility

**Fix**: Update Jest or use different mocking approach

## CI Workflow Status
✅ Runs on every PR
✅ Executes full test suite
✅ Fails pipeline when tests fail
✅ Blocks merge on failure

## Next Steps
1. Fix test code to match current implementation
2. Install missing dependencies
3. Update Jest mocking patterns
4. Re-run CI to verify fixes
