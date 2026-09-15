/**
 * STRIPE CONFIGURATION
 * =====================
 * Fișier de configurare pentru Stripe SDK
 * Inițializează clientul Stripe cu cheia secretă din variabilele de mediu
 */

// Importă biblioteca Stripe
const Stripe = require('stripe');

// Extrage cheia secretă din variabilele de mediu
let stripe;

function client(secretKey = process.env.STRIPE_SECRET_KEY) {
  if (!secretKey) throw new Error('Cheia secretă Stripe nu este configurată.');
  if (!stripe || stripe.__configuredKey !== secretKey) {
    stripe = new Stripe(secretKey);
    Object.defineProperty(stripe, '__configuredKey', { value: secretKey });
  }
  return stripe;
}

// Compatibilitate cu serviciul Stripe existent, dar fără a bloca pornirea
// gateway-ului atunci când este folosit exclusiv un alt provider.
module.exports = new Proxy({ client }, {
  get(target, property) {
    if (property === 'client') return target.client;
    return client()[property];
  },
});
