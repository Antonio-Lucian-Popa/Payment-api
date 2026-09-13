process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy';

jest.mock('../src/config/stripe', () => ({
  coupons: {
    create: jest.fn(),
  },
  subscriptions: {
    update: jest.fn(),
  },
}));

jest.mock('../src/services/webhookForwarder', () => ({
  forwardEvent: jest.fn(),
}));

const stripe = require('../src/config/stripe');
const stripeService = require('../src/services/stripeService');

describe('stripeService.applySubscriptionCoupon', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creează un cupon 100% repetitiv și îl aplică subscripției', async () => {
    stripe.coupons.create.mockResolvedValue({ id: 'coupon_123' });
    stripe.subscriptions.update.mockResolvedValue({ id: 'sub_123' });

    const result = await stripeService.applySubscriptionCoupon({
      subscriptionId: 'sub_123',
      months: 2,
      name: 'Referral reward',
    });

    expect(stripe.coupons.create).toHaveBeenCalledWith({
      percent_off: 100,
      duration: 'repeating',
      duration_in_months: 2,
      name: 'Referral reward',
    });
    expect(stripe.subscriptions.update).toHaveBeenCalledWith('sub_123', {
      coupon: 'coupon_123',
    });
    expect(result).toEqual({
      subscriptionId: 'sub_123',
      couponId: 'coupon_123',
    });
  });
});
