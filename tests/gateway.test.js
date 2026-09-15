process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.PAYMENT_STATE_SECRET = 'a-secure-test-secret-with-32-characters';

jest.mock('../src/services/providers', () => ({
  createCheckout: jest.fn(), getStatus: jest.fn(), normalizeStatus: jest.fn(),
}));

const request = require('supertest');
const providers = require('../src/services/providers');
const app = require('../src/index');

describe('gateway provider-agnostic', () => {
  afterEach(() => jest.clearAllMocks());

  it('validează contractul comun', async () => {
    const response = await request(app).post('/api/payment/v1/checkouts').send({ provider: 'invalid' });
    expect(response.status).toBe(400);
  });

  it('creează checkout și nu returnează credentialele', async () => {
    providers.createCheckout.mockResolvedValue({ paymentRef: 'ref-provider', checkoutUrl: 'https://provider.test/pay', status: 'pending' });
    const response = await request(app).post('/api/payment/v1/checkouts').send({
      provider: 'stripe', reference: 'order-1', successUrl: 'https://app.test/success',
      cancelUrl: 'https://app.test/cancel', credentials: { secretKey: 'secret' },
      items: [{ name: 'Cazare', price: 10000, currency: 'RON', quantity: 1 }],
    });
    expect(response.status).toBe(201);
    expect(response.body).not.toHaveProperty('credentials');
    expect(providers.createCheckout).toHaveBeenCalledWith(expect.objectContaining({ provider: 'stripe' }), expect.any(String), expect.stringContaining('/webhook/stripe'));
  });
});
