/**
 * STRIPE CONFIGURATION
 * =====================
 * Fișier de configurare pentru Stripe SDK
 * Inițializează clientul Stripe cu cheia secretă din variabilele de mediu
 */

// Importă biblioteca Stripe
const Stripe = require('stripe');

// Extrage cheia secretă din variabilele de mediu
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// Validare - asigură-te că cheia secretă este configurată
if (!stripeSecretKey) {
  throw new Error(
    'STRIPE_SECRET_KEY nu este definit în variabilele de mediu. ' +
    'Te rog configurează .env fișierul cu cheia ta Stripe.'
  );
}

// Inițializează și exportă instanța Stripe
// Instanța Stripe permite comunicarea cu API-ul Stripe
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16', // Versiunea API-ului Stripe care vrem să folosim
});

module.exports = stripe;
