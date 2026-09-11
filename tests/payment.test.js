/**
 * TESTE DE BAZĂ - PAYMENT API
 * ===========================
 * Testează rutele fără a apela API-ul real Stripe (serviciul este mock-uit).
 */

// Setăm variabile de mediu ÎNAINTE de a importa aplicația,
// pentru ca modulele de config să nu arunce eroare la require.
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.NODE_ENV = 'test';

// Mock complet al serviciului Stripe - nu facem apeluri de rețea reale.
jest.mock('../src/services/stripeService', () => ({
  createCheckoutSession: jest.fn(),
  createPortalSession: jest.fn(),
  applySubscriptionCoupon: jest.fn(),
  handleWebhook: jest.fn(),
  getSessionStatus: jest.fn(),
  getPaymentIntentDetails: jest.fn(),
}));

const request = require('supertest');
const app = require('../src/index');
const stripeService = require('../src/services/stripeService');

describe('Payment API', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    it('returnează documentația și status 200', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.endpoints)).toBe(true);
    });
  });

  describe('GET /api/payment/health', () => {
    it('returnează 200 și success true', async () => {
      const res = await request(app).get('/api/payment/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/payment/checkout', () => {
    it('respinge request-ul fără items (400)', async () => {
      const res = await request(app)
        .post('/api/payment/checkout')
        .send({ successUrl: 'https://a.com/ok', cancelUrl: 'https://a.com/no' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('respinge item fără preț valid (400)', async () => {
      const res = await request(app)
        .post('/api/payment/checkout')
        .send({
          items: [{ name: 'X', currency: 'ron', price: -5 }],
          successUrl: 'https://a.com/ok',
          cancelUrl: 'https://a.com/no',
        });
      expect(res.status).toBe(400);
    });

    it('creează o sesiune validă (200) și returnează checkoutUrl', async () => {
      stripeService.createCheckoutSession.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      });

      const res = await request(app)
        .post('/api/payment/checkout')
        .send({
          items: [{ name: 'Produs', currency: 'ron', price: 1000, quantity: 1 }],
          successUrl: 'https://a.com/ok',
          cancelUrl: 'https://a.com/no',
          clientId: 'user1',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.sessionId).toBe('cs_test_123');
      expect(res.body.checkoutUrl).toContain('checkout.stripe.com');
      expect(stripeService.createCheckoutSession).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /api/payment/checkout/subscription', () => {
    it('creează un abonament lunar (200) în mod subscription', async () => {
      stripeService.createCheckoutSession.mockResolvedValue({
        id: 'cs_sub_1',
        url: 'https://checkout.stripe.com/pay/cs_sub_1',
      });

      const res = await request(app)
        .post('/api/payment/checkout/subscription')
        .send({
          items: [{ name: 'Abonament', currency: 'ron', price: 2000 }],
          successUrl: 'https://a.com/ok',
          cancelUrl: 'https://a.com/no',
        });

      expect(res.status).toBe(200);
      expect(res.body.mode).toBe('subscription');
      expect(res.body.billingType).toBe('monthly');
    });
  });

  describe('POST /api/payment/portal', () => {
    it('respinge request-ul fără customerId/returnUrl (400)', async () => {
      const res = await request(app)
        .post('/api/payment/portal')
        .send({ returnUrl: 'https://a.com/back' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('creează o sesiune de portal (200) și returnează url', async () => {
      stripeService.createPortalSession.mockResolvedValue({
        url: 'https://billing.stripe.com/session/test',
      });

      const res = await request(app)
        .post('/api/payment/portal')
        .send({ customerId: 'cus_123', returnUrl: 'https://a.com/back' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.url).toContain('billing.stripe.com');
      expect(stripeService.createPortalSession).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /api/payment/subscription/coupon', () => {
    it('respinge lipsa subscriptionId (400)', async () => {
      const res = await request(app)
        .post('/api/payment/subscription/coupon')
        .send({ months: 1 });
      expect(res.status).toBe(400);
    });

    it('respinge months invalid (400)', async () => {
      const res = await request(app)
        .post('/api/payment/subscription/coupon')
        .send({ subscriptionId: 'sub_1', months: 0 });
      expect(res.status).toBe(400);
    });

    it('aplică cuponul (200)', async () => {
      stripeService.applySubscriptionCoupon.mockResolvedValue({
        couponId: 'co_1',
        subscriptionId: 'sub_1',
      });
      const res = await request(app)
        .post('/api/payment/subscription/coupon')
        .send({ subscriptionId: 'sub_1', months: 1 });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.couponId).toBe('co_1');
    });
  });

  describe('POST /api/payment/webhook', () => {
    it('respinge request-ul fără header stripe-signature (400)', async () => {
      const res = await request(app)
        .post('/api/payment/webhook')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ type: 'checkout.session.completed' }));
      expect(res.status).toBe(400);
    });
  });

  describe('404 handler', () => {
    it('returnează 404 pentru o rută necunoscută', async () => {
      const res = await request(app).get('/ruta/inexistenta');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
