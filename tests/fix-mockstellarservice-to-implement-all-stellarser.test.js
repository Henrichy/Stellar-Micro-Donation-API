const MockStellarService = require('../src/services/MockStellarService');
const { resetMockStellarService } = require('./helpers/testIsolation');

describe('MockStellarService interface compliance', () => {
  let service;

  beforeEach(() => {
    service = new MockStellarService();
  });

  afterEach(() => {
    resetMockStellarService(service);
  });

  test('isValidAddress should validate Stellar public keys', () => {
    expect(service.isValidAddress('GABCDEFGHIJKLMNOPQRSTUVWXY23456789012345678901234567890')).toBe(false); // short
    const valid = 'G' + 'A'.repeat(55);
    expect(service.isValidAddress(valid)).toBe(true);
  });

  test('loadAccount should return account object and throw not found', async () => {
    const wallet = await service.createWallet();
    const account = await service.loadAccount(wallet.publicKey);

    expect(account.accountId()).toBe(wallet.publicKey);
    expect(account.sequenceNumber()).toBe('0');
    expect(Array.isArray(account.balances)).toBe(true);
    await expect(service.loadAccount('G' + 'A'.repeat(55))).rejects.toThrow('Account not found');
  });

  test('getAccountSequence should return mocked sequence', async () => {
    const wallet = await service.createWallet();
    await service.fundTestnetWallet(wallet.publicKey);

    const seq = await service.getAccountSequence(wallet.publicKey);
    expect(seq).toBe('1');
    await expect(service.getAccountSequence('G' + 'A'.repeat(55))).rejects.toThrow('Account not found');
  });

  test('stroopsToXlm and xlmToStroops conversions should be consistent', () => {
    expect(service.stroopsToXlm('10000000')).toBe('1.0000000');
    expect(service.xlmToStroops('2.5')).toBe('25000000');
    expect(service.stroopsToXlm(service.xlmToStroops('3.1234567'))).toBe('3.1234567');
  });

  test('buildTransaction and buildPaymentTransaction should return objects', async () => {
    const source = await service.createWallet();
    const destination = await service.createWallet();

    const tx = await service.buildTransaction(source.publicKey, [{ type: 'noop' }], { memo: 'test' });
    expect(tx.sourcePublicKey).toBe(source.publicKey);
    expect(tx.operations.length).toBe(1);

    const ptx = await service.buildPaymentTransaction(source.publicKey, destination.publicKey, '10', { memo: 'send' });
    expect(ptx.operations[0].type).toBe('payment');
    expect(ptx.operations[0].destination).toBe(destination.publicKey);
  });

  test('signTransaction should produce signature and hash without crypto operations', async () => {
    const tx = { some: 'transaction' };
    const signed = await service.signTransaction(tx, 'S' + 'A'.repeat(55));
    expect(signed.signature).toMatch(/^mock_sign_/);
    expect(signed.hash).toMatch(/^mock_hash_/);
  });

  test('submitTransaction should succeed and allow failure flag', async () => {
    const result = await service.submitTransaction({ any: 'payload' });
    expect(result.successful).toBe(true);

    service.setSubmitTransactionFailure(true);
    await expect(service.submitTransaction({ any: 'payload' })).rejects.toThrow('Mock submitTransaction failure');
  });

  test('getAccountBalances should mirror existing getBalance results', async () => {
    const wallet = await service.createWallet();
    await service.fundTestnetWallet(wallet.publicKey);

    const balances = await service.getAccountBalances(wallet.publicKey);
    expect(balances.balances[0].balance).toBe('10000.0000000');

    await expect(service.getAccountBalances('G' + 'A'.repeat(55))).rejects.toThrow('Account not found');
  });

  test('getTransaction should retrieve transaction by Hash/ID and throw when missing', async () => {
    const source = await service.createWallet();
    const dest = await service.createWallet();
    await service.fundTestnetWallet(source.publicKey);
    await service.fundTestnetWallet(dest.publicKey);

    const donation = await service.sendDonation({ sourceSecret: source.secretKey, destinationPublic: dest.publicKey, amount: '1.00', memo: 'txn test' });

    const tx1 = await service.getTransaction(donation.transactionId);
    expect(tx1.transactionId).toBe(donation.transactionId);

    await expect(service.getTransaction('does_not_exist')).rejects.toThrow('Transaction not found');
  });
});
