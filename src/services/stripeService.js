/**
 * STRIPE SERVICE
 * ==============
 * Serviciu care conține logica de business pentru operațiile Stripe
 * Separă logica de routing (din controller) de interacțiunea cu API-ul Stripe
 */

const stripe = require('../config/stripe');

/**
 * Creează o sesiune de checkout Stripe
 * 
 * @param {Array} items - Lista de produse de cumpărat
 *   Fiecare item trebuie să aibă: name, description, price (în bani), currency, quantity
 * @param {string} successUrl - URL-ul către care merge userul după plată reușită
 * @param {string} cancelUrl - URL-ul către care merge userul dacă anulează plata
 * @param {string} clientId - ID-ul unic al clientului (optional, pentru tracking)
 * @returns {Promise} Promisiune cu datele sesiunii Stripe
 */
async function createCheckoutSession(items, successUrl, cancelUrl, clientId = null) {
  try {
    // Transformă itemele din format generic în format Stripe line_items
    // Stripe necesită format specific pentru checkout
    const lineItems = items.map(item => ({
      price_data: {
        currency: item.currency.toLowerCase(), // ISO 4217 currency code (ron, usd, eur)
        product_data: {
          name: item.name,
          description: item.description || 'Produs', // Descriere sau valoare default
          // Opțional: imagini
          // images: [item.image] // URL-ul imaginii produsului
        },
        unit_amount: item.price, // Preț în cea mai mică unitate (bani pentru RON)
      },
      quantity: item.quantity || 1, // Cantitate implicită 1
    }));

    // Creează sesiunea de checkout cu Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], // Acceptă plăți cu card
      line_items: lineItems,
      mode: 'payment', // Mod payment (o dată) vs subscription
      success_url: successUrl,
      cancel_url: cancelUrl,
      // Metadate pentru tracking (opțional)
      metadata: {
        clientId: clientId || 'unknown',
        createdAt: new Date().toISOString(),
      },
    });

    return session;
  } catch (error) {
    // Înregistrează eroarea pentru debug
    console.error('Eroare la crearea sesiei de checkout:', error);
    throw error; // Re-throw eroarea pentru a fi tratată în controller
  }
}

/**
 * Prelucrează evenimentele webhook Stripe
 * 
 * @param {string} rawBody - Body-ul raw al requestului (pentru verificare semnăturii)
 * @param {string} signature - Signature din header-ul Stripe
 * @returns {Promise} Evenimentul Stripe procesat
 */
async function handleWebhook(rawBody, signature) {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    // Verifică autenticitatea evenimentului Stripe folosind semnătura
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );

    // Procesează diferite tipuri de evenimente
    switch (event.type) {
      case 'checkout.session.completed':
        // Sesiunea de checkout s-a completat cu succes (plată confirmată)
        const session = event.data.object;
        console.log('Plată confirmată - Sesiune ID:', session.id);
        // Aici poți integra cu baza de date pentru a marca comanda ca plătită
        break;

      case 'checkout.session.async_payment_succeeded':
        // Plata asincronă a reușit
        console.log('Plată asincronă reușită');
        break;

      case 'checkout.session.async_payment_failed':
        // Plata asincronă a eșuat
        console.log('Plată asincronă eșuată');
        break;

      case 'charge.failed':
        // Taxa a eșuat
        console.log('Taxa eșuată:', event.data.object.id);
        break;

      default:
        // Eveniment necunoscut
        console.log('Eveniment neașteptat:', event.type);
    }

    return event;
  } catch (error) {
    console.error('Eroare la prelucrarea webhook:', error);
    throw error;
  }
}

/**
 * Obține statusul unei sesiuni de checkout
 * 
 * @param {string} sessionId - ID-ul sesiunii de checkout
 * @returns {Promise} Obiectul sesiunii cu detalii complete
 */
async function getSessionStatus(sessionId) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'line_items'], // Include detalii suplimentare
    });
    return session;
  } catch (error) {
    console.error('Eroare la obținerea statusului sesiei:', error);
    throw error;
  }
}

/**
 * Obține detalii despre un payment intent
 * 
 * @param {string} paymentIntentId - ID-ul payment intent
 * @returns {Promise} Obiectul payment intent
 */
async function getPaymentIntentDetails(paymentIntentId) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('Eroare la obținerea detaliilor payment intent:', error);
    throw error;
  }
}

// Exportă toate funcțiile serviciului
module.exports = {
  createCheckoutSession,
  handleWebhook,
  getSessionStatus,
  getPaymentIntentDetails,
};
