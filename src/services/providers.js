const crypto = require('crypto');
const Stripe = require('stripe');
const { EuPlatesc } = require('euplatesc');
const { Netopia } = require('netopia-payment2');

const PAID_NETOPIA = new Set([3, 5]);

function total(items) {
  return items.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
}

function requireFields(value, names, provider) {
  const missing = names.filter((name) => !value?.[name]);
  if (missing.length) throw Object.assign(new Error(`${provider}: lipsesc ${missing.join(', ')}`), { statusCode: 400 });
}

function normalizeStatus(status) {
  const value = String(status || '').toLowerCase();
  if (['paid', 'succeeded', 'complete', 'completed', 'captured', '3', '5'].includes(value)) return 'paid';
  if (['failed', 'declined', 'canceled', 'cancelled', 'expired', '12'].includes(value)) return 'failed';
  if (['refunded', 'reversed', '17'].includes(value)) return 'refunded';
  return 'pending';
}

async function stripeCheckout(payload, state) {
  requireFields(payload.credentials, ['secretKey'], 'Stripe');
  const stripe = new Stripe(payload.credentials.secretKey);
  const session = await stripe.checkout.sessions.create({
    mode: payload.billingType === 'monthly' ? 'subscription' : 'payment',
    line_items: payload.items.map((item) => ({
      price_data: {
        currency: item.currency.toLowerCase(),
        product_data: { name: item.name, description: item.description || undefined },
        unit_amount: item.price,
        ...(payload.billingType === 'monthly' ? { recurring: { interval: 'month' } } : {}),
      },
      quantity: payload.billingType === 'monthly' ? 1 : (item.quantity || 1),
    })),
    success_url: payload.successUrl,
    cancel_url: payload.cancelUrl,
    customer_email: payload.customer?.email || undefined,
    metadata: { reference: payload.reference, gatewayState: state },
    ...(payload.billingType === 'monthly'
      ? { subscription_data: { metadata: { reference: payload.reference, gatewayState: state } } }
      : { payment_intent_data: { metadata: { reference: payload.reference, gatewayState: state } } }),
  });
  return { paymentRef: session.id, checkoutUrl: session.url, status: 'pending' };
}

async function euplatescCheckout(payload, notifyUrl) {
  requireFields(payload.credentials, ['merchantId', 'secretKey'], 'EuPlătesc');
  const client = new EuPlatesc({
    merchantId: payload.credentials.merchantId,
    secretKey: payload.credentials.secretKey,
    testMode: payload.testMode !== false,
    userKey: payload.credentials.userKey,
    userApi: payload.credentials.userApi,
  });
  const result = client.paymentUrl({
    amount: total(payload.items) / 100,
    currency: payload.items[0].currency.toUpperCase(),
    invoiceId: payload.reference,
    orderDescription: payload.description || payload.items.map((item) => item.name).join(', '),
    billingFirstName: payload.customer?.firstName,
    billingLastName: payload.customer?.lastName,
    billingEmail: payload.customer?.email,
    billingPhone: payload.customer?.phone,
    silentUrl: notifyUrl,
    silentUrlSec: notifyUrl,
    successUrl: payload.successUrl,
    failedUrl: payload.cancelUrl,
    backToSite: payload.successUrl,
    lang: payload.language || 'ro',
    generateEpId: '1',
  });
  return { paymentRef: payload.reference, checkoutUrl: result.paymentUrl, status: 'pending' };
}

async function netopiaCheckout(payload, notifyUrl) {
  requireFields(payload.credentials, ['apiKey', 'posSignature'], 'NETOPIA');
  const client = new Netopia({ apiKey: payload.credentials.apiKey, posSignature: payload.credentials.posSignature, isLive: payload.testMode === false });
  const customer = payload.customer || {};
  const result = await client.createOrder(
    { notifyUrl, redirectUrl: payload.successUrl, cancelUrl: payload.cancelUrl, language: payload.language || 'ro' },
    { options: { installments: 1, bonus: 0 }, instrument: { type: 'card', token: '' }, data: {} },
    {
      ntpID: '', orderID: payload.reference,
      description: payload.description || payload.items.map((item) => item.name).join(', '),
      amount: total(payload.items) / 100, currency: payload.items[0].currency.toUpperCase(),
      dateTime: new Date().toISOString().slice(0, 19),
      billing: {
        email: customer.email || 'guest@example.invalid', phone: customer.phone || '-',
        firstName: customer.firstName || 'Guest', lastName: customer.lastName || '-',
        city: customer.city || '-', country: customer.countryCode || 642,
        countryName: customer.country || 'Romania', state: customer.state || '-',
        postalCode: customer.postalCode || '-', details: customer.address || '-',
      },
      products: payload.items.map((item) => ({ name: item.name, code: item.code || payload.reference, category: item.category || 'services', price: item.price / 100, vat: item.vatRate || 0 })),
    },
  );
  const data = result.data || result;
  const payment = data.payment || data.order?.payment || {};
  return {
    paymentRef: String(payment.ntpID || payload.reference),
    checkoutUrl: payment.paymentURL || data.customerAction?.url || null,
    status: PAID_NETOPIA.has(Number(payment.status)) ? 'paid' : 'pending',
    action: data.customerAction || undefined,
  };
}

function saferpayHeader(credentials, requestId = crypto.randomUUID()) {
  return { SpecVersion: credentials.specVersion || '1.53', CustomerId: credentials.customerId, RequestId: requestId, RetryIndicator: 0 };
}

async function saferpayCall(credentials, path, body) {
  const base = credentials.baseUrl || (credentials.testMode === false ? 'https://www.saferpay.com/api' : 'https://test.saferpay.com/api');
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', authorization: `Basic ${Buffer.from(`${credentials.apiUser}:${credentials.apiPassword}`).toString('base64')}` },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.ErrorMessage || `Saferpay HTTP ${response.status}`), { statusCode: 502, details: data });
  return data;
}

async function saferpayCheckout(payload, notifyUrl) {
  requireFields(payload.credentials, ['customerId', 'terminalId', 'apiUser', 'apiPassword'], 'Saferpay');
  const credentials = { ...payload.credentials, testMode: payload.testMode };
  const result = await saferpayCall(credentials, '/Payment/v1/PaymentPage/Initialize', {
    RequestHeader: saferpayHeader(credentials), TerminalId: credentials.terminalId,
    Payment: { Amount: { Value: String(total(payload.items)), CurrencyCode: payload.items[0].currency.toUpperCase() }, OrderId: payload.reference, Description: payload.description || payload.items.map((item) => item.name).join(', ') },
    ReturnUrl: { Url: payload.successUrl }, Notification: { NotifyUrl: notifyUrl },
    Payer: payload.customer?.email ? { LanguageCode: (payload.language || 'ro').toUpperCase(), BillingAddress: { Email: payload.customer.email } } : undefined,
  });
  return { paymentRef: result.Token, checkoutUrl: result.RedirectUrl, status: 'pending', expiresAt: result.Expiration };
}

async function createCheckout(payload, state, notifyUrl) {
  if (payload.provider === 'stripe') return stripeCheckout(payload, state);
  if (payload.provider === 'euplatesc') return euplatescCheckout(payload, notifyUrl);
  if (payload.provider === 'netopia') return netopiaCheckout(payload, notifyUrl);
  if (payload.provider === 'saferpay') return saferpayCheckout(payload, notifyUrl);
  throw Object.assign(new Error(`Provider nesuportat: ${payload.provider}`), { statusCode: 400 });
}

async function getStatus(provider, paymentRef, credentials, testMode = true) {
  if (provider === 'stripe') {
    requireFields(credentials, ['secretKey'], 'Stripe');
    const session = await new Stripe(credentials.secretKey).checkout.sessions.retrieve(paymentRef);
    return { paymentRef, status: normalizeStatus(session.payment_status), raw: session };
  }
  if (provider === 'euplatesc') {
    requireFields(credentials, ['merchantId', 'secretKey'], 'EuPlătesc');
    const result = await new EuPlatesc({ merchantId: credentials.merchantId, secretKey: credentials.secretKey, testMode }).getStatus({ invoiceId: paymentRef });
    const first = Array.isArray(result.success) ? result.success[0] : result.success;
    return { paymentRef, status: normalizeStatus(first?.status || first || result.status), raw: result };
  }
  if (provider === 'netopia') {
    requireFields(credentials, ['apiKey', 'posSignature'], 'NETOPIA');
    const result = await new Netopia({ apiKey: credentials.apiKey, posSignature: credentials.posSignature, isLive: !testMode }).getStatus(paymentRef);
    const status = result.data?.payment?.status || result.payment?.status;
    return { paymentRef, status: PAID_NETOPIA.has(Number(status)) ? 'paid' : normalizeStatus(status), raw: result };
  }
  if (provider === 'saferpay') {
    requireFields(credentials, ['customerId', 'apiUser', 'apiPassword'], 'Saferpay');
    const scoped = { ...credentials, testMode };
    const result = await saferpayCall(scoped, '/Payment/v1/PaymentPage/Assert', { RequestHeader: saferpayHeader(scoped), Token: paymentRef });
    return { paymentRef, status: normalizeStatus(result.Transaction?.Status), raw: result };
  }
  throw Object.assign(new Error(`Provider nesuportat: ${provider}`), { statusCode: 400 });
}

module.exports = { createCheckout, getStatus, normalizeStatus };
