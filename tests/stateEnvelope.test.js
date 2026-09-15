describe('stateEnvelope', () => {
  beforeAll(() => { process.env.PAYMENT_STATE_SECRET = 'a-secure-test-secret-with-32-characters'; });

  it('criptează și autentifică starea fără a expune credentialele', () => {
    const state = require('../src/services/stateEnvelope');
    const token = state.seal({ provider: 'stripe', credentials: { secretKey: 'sk_test_secret' } });
    expect(token).not.toContain('sk_test_secret');
    expect(state.open(token)).toMatchObject({ provider: 'stripe', credentials: { secretKey: 'sk_test_secret' } });
  });

  it('respinge o stare modificată', () => {
    const state = require('../src/services/stateEnvelope');
    const token = state.seal({ provider: 'stripe' });
    expect(() => state.open(`${token.slice(0, -2)}xx`)).toThrow('invalidă');
  });
});
