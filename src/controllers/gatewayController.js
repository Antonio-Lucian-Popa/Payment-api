const providers = require('../services/providers');
const envelope = require('../services/stateEnvelope');
const webhookForwarder = require('../services/webhookForwarder');

const SUPPORTED = new Set(['stripe', 'euplatesc', 'netopia', 'saferpay']);

function validate(body) {
  if (!SUPPORTED.has(body.provider)) return 'provider invalid';
  if (!body.reference || !body.successUrl || !body.cancelUrl) return 'reference, successUrl și cancelUrl sunt obligatorii';
  if (!Array.isArray(body.items) || !body.items.length) return 'items este obligatoriu';
  if (body.items.some((item) => !item.name || !Number.isInteger(item.price) || item.price <= 0 || !item.currency)) return 'Fiecare item necesită name, price întreg pozitiv în unitatea minimă și currency';
  if (!body.credentials || typeof body.credentials !== 'object') return 'credentials este obligatoriu';
  if (body.callbackUrl) {
    let callback;
    try { callback = new URL(body.callbackUrl); }
    catch { return 'callbackUrl invalid'; }
    if (process.env.NODE_ENV === 'production' && callback.protocol !== 'https:') return 'callbackUrl trebuie să folosească HTTPS în producție';
    const allowed = (process.env.WEBHOOK_FORWARD_ALLOWED_HOSTS || '').split(',').map((host) => host.trim()).filter(Boolean);
    if (allowed.length && !allowed.includes(callback.host)) return 'callbackUrl nu este în WEBHOOK_FORWARD_ALLOWED_HOSTS';
  }
  return null;
}

async function createCheckout(req, res, next) {
  try {
    const error = validate(req.body);
    if (error) return res.status(400).json({ success: false, error });
    const publicUrl = (process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    const state = envelope.seal({ provider: req.body.provider, credentials: req.body.credentials, reference: req.body.reference, callbackUrl: req.body.callbackUrl, testMode: req.body.testMode !== false, metadata: req.body.metadata });
    const notifyUrl = `${publicUrl}/api/payment/webhook/${req.body.provider}?state=${encodeURIComponent(state)}`;
    const checkout = await providers.createCheckout(req.body, state, notifyUrl);
    return res.status(201).json({ success: true, provider: req.body.provider, ...checkout });
  } catch (error) { next(error); }
}

async function status(req, res, next) {
  try {
    if (!SUPPORTED.has(req.body.provider) || !req.body.paymentRef || !req.body.credentials) return res.status(400).json({ success: false, error: 'provider, paymentRef și credentials sunt obligatorii' });
    const result = await providers.getStatus(req.body.provider, req.body.paymentRef, req.body.credentials, req.body.testMode !== false);
    return res.json({ success: true, provider: req.body.provider, ...result });
  } catch (error) { next(error); }
}

async function webhook(req, res, next) {
  try {
    const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
    let body = req.body;
    if (raw) {
      try { body = JSON.parse(raw); }
      catch { body = Object.fromEntries(new URLSearchParams(raw)); }
    }
    let stateToken = req.query.state;
    if (req.params.provider === 'stripe' && !stateToken) {
      stateToken = body.data?.object?.metadata?.gatewayState;
    }
    const state = envelope.open(stateToken);
    if (state.provider !== req.params.provider) return res.status(400).json({ success: false, error: 'Provider mismatch' });
    let event;
    if (state.provider === 'stripe') {
      const stripe = new (require('stripe'))(state.credentials.secretKey);
      const parsed = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], state.credentials.webhookSecret);
      const object = parsed.data.object;
      event = { id: parsed.id, type: parsed.type, provider: 'stripe', reference: state.reference, paymentRef: object.id, status: providers.normalizeStatus(object.payment_status || (parsed.type.includes('failed') ? 'failed' : undefined)), metadata: state.metadata };
    } else {
      const result = await providers.getStatus(state.provider, String(body.ep_id || body.epId || body.ntpID || body.Token || state.reference), state.credentials, state.testMode);
      event = { id: `${state.provider}:${result.paymentRef}:${result.status}`, type: `payment.${result.status}`, provider: state.provider, reference: state.reference, paymentRef: result.paymentRef, status: result.status, metadata: state.metadata };
    }
    webhookForwarder.forwardNormalizedEvent(event, state.callbackUrl);
    return res.json({ success: true, received: true });
  } catch (error) { next(error); }
}

function providersList(_req, res) { res.json({ providers: [...SUPPORTED] }); }

module.exports = { createCheckout, status, webhook, providersList };
