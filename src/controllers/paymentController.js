/**
 * PAYMENT CONTROLLER
 * ==================
 * Controller pentru gestionarea request-urilor legate de plăți
 * Coordonează între router și service
 */

const stripeService = require('../services/stripeService');

function validateCheckoutRequest({ items, successUrl, cancelUrl, billingType, customerEmail }) {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return 'items array este obligatoriu și trebuie să conțină cel puțin un produs';
  }

  if (!successUrl || !cancelUrl) {
    return 'successUrl și cancelUrl sunt obligatorii';
  }

  if (billingType && !['one_time', 'monthly'].includes(billingType)) {
    return 'billingType trebuie să fie one_time sau monthly';
  }

  if (customerEmail && typeof customerEmail !== 'string') {
    return 'customerEmail trebuie să fie string';
  }

  for (const item of items) {
    if (!item.name || !item.price || !item.currency) {
      return 'Fiecare produs trebuie să aibă: name, price, currency';
    }

    if (typeof item.price !== 'number' || item.price <= 0) {
      return `Prețul pentru "${item.name}" trebuie să fie un număr pozitiv`;
    }

    if (billingType === 'monthly' && item.quantity && item.quantity !== 1) {
      return `Abonamentele lunare acceptă doar quantity 1 pentru produsul "${item.name}"`;
    }
  }

  return null;
}

async function buildCheckoutResponse(res, payload) {
  const session = await stripeService.createCheckoutSession(payload);

  return res.status(200).json({
    success: true,
    sessionId: session.id,
    checkoutUrl: session.url,
    mode: payload.billingType === 'monthly' ? 'subscription' : 'payment',
    billingType: payload.billingType || 'one_time',
    message: payload.billingType === 'monthly'
      ? 'Sesiune de abonament lunar creată cu succes'
      : 'Sesiune de checkout creată cu succes',
  });
}

/**
 * Crează o sesiune de checkout Stripe
 * 
 * URL: POST /api/payment/checkout
 * Body: { items, successUrl, cancelUrl, clientId, billingType, customerEmail }
 */
async function createCheckout(req, res, next) {
  try {
    const { items, successUrl, cancelUrl, clientId, billingType = 'one_time', customerEmail } = req.body;

    const validationError = validateCheckoutRequest({
      items,
      successUrl,
      cancelUrl,
      billingType,
      customerEmail,
    });

    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError,
      });
    }

    return await buildCheckoutResponse(res, {
      items,
      successUrl,
      cancelUrl,
      clientId,
      billingType,
      customerEmail,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Creează o sesiune Stripe pentru abonamente lunare.
 *
 * URL: POST /api/payment/checkout/subscription
 * Body: { items, successUrl, cancelUrl, clientId, customerEmail }
 */
async function createMonthlySubscriptionCheckout(req, res, next) {
  try {
    const { items, successUrl, cancelUrl, clientId, customerEmail } = req.body;
    const billingType = 'monthly';

    const validationError = validateCheckoutRequest({
      items,
      successUrl,
      cancelUrl,
      billingType,
      customerEmail,
    });

    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError,
      });
    }

    return await buildCheckoutResponse(res, {
      items,
      successUrl,
      cancelUrl,
      clientId,
      billingType,
      customerEmail,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Procesează webhook-urile Stripe
 * 
 * URL: POST /api/payment/webhook
 * Header: stripe-signature
 */
async function handleWebhook(req, res, next) {
  try {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(400).json({
        success: false,
        error: 'stripe-signature header nu a fost găsit',
      });
    }

    const rawBody = req.rawBody || req.body;
    const event = await stripeService.handleWebhook(rawBody, signature);

    return res.status(200).json({
      success: true,
      received: true,
      eventType: event.type,
      eventId: event.id,
    });
  } catch (error) {
    if (error.type === 'StripeSignatureVerificationError') {
      return res.status(400).json({
        success: false,
        error: 'Semnătura Stripe nu a putut fi verificată',
      });
    }
    next(error);
  }
}

/**
 * Obține statusul unui checkout
 * 
 * URL: GET /api/payment/status/:sessionId
 * Param: sessionId - ID-ul sesiunii de checkout
 */
async function getCheckoutStatus(req, res, next) {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId este obligatoriu',
      });
    }

    const session = await stripeService.getSessionStatus(sessionId);

    return res.status(200).json({
      success: true,
      session: {
        id: session.id,
        mode: session.mode,
        status: session.payment_status,
        amountTotal: session.amount_total,
        currency: session.currency,
        customerEmail: session.customer_email,
        paymentIntentId: session.payment_intent?.id,
        subscriptionId: typeof session.subscription === 'object' ? session.subscription?.id : session.subscription,
        clientId: session.metadata?.clientId,
        billingType: session.metadata?.billingType,
      },
    });
  } catch (error) {
    next(error);
  }
}

function healthCheck(req, res) {
  return res.status(200).json({
    success: true,
    message: 'Payment API este activ',
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  createCheckout,
  createMonthlySubscriptionCheckout,
  handleWebhook,
  getCheckoutStatus,
  healthCheck,
};
