/**
 * PAYMENT CONTROLLER
 * ==================
 * Controller pentru gestionarea request-urilor legate de plăți
 * Coordonează între router și service
 */

const stripeService = require('../services/stripeService');

/**
 * Crează o sesiune de checkout Stripe
 * 
 * URL: POST /api/payment/checkout
 * Body: { items, successUrl, cancelUrl, clientId }
 */
async function createCheckout(req, res, next) {
  try {
    const { items, successUrl, cancelUrl, clientId } = req.body;

    // VALIDARE INPUT
    // Verifică dacă sunt furnizate date obligatorii
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'items array este obligatoriu și trebuie să conțină cel puțin un produs',
      });
    }

    if (!successUrl || !cancelUrl) {
      return res.status(400).json({
        success: false,
        error: 'successUrl și cancelUrl sunt obligatorii',
      });
    }

    // Validare fiecare item din coș
    for (let item of items) {
      if (!item.name || !item.price || !item.currency) {
        return res.status(400).json({
          success: false,
          error: 'Fiecare produs trebuie să aibă: name, price, currency',
        });
      }

      // Asigură-te că prețul este un număr pozitiv
      if (typeof item.price !== 'number' || item.price <= 0) {
        return res.status(400).json({
          success: false,
          error: `Prețul pentru "${item.name}" trebuie să fie un număr pozitiv`,
        });
      }
    }

    // CREAȚIE SESIUNE
    // Apelează serviciul Stripe pentru a crea sesiunea
    const session = await stripeService.createCheckoutSession(
      items,
      successUrl,
      cancelUrl,
      clientId
    );

    // RĂSPUNS SUCCES
    return res.status(200).json({
      success: true,
      sessionId: session.id,
      checkoutUrl: session.url, // URL-ul de checkout Stripe
      message: 'Sesiune de checkout creată cu succes',
    });
  } catch (error) {
    // Transmite eroarea la middleware-ul de error handling
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
    // Obține semnătura din header
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(400).json({
        success: false,
        error: 'stripe-signature header nu a fost găsit',
      });
    }

    // Obține body-ul raw (raw buffer) - important pentru verificare semnăturii
    // Expresul parsează JSON automat, dar trebuie body raw pentru verificare
    const rawBody = req.rawBody || req.body;

    // Procesează webhook-ul
    const event = await stripeService.handleWebhook(rawBody, signature);

    return res.status(200).json({
      success: true,
      received: true,
      eventType: event.type,
      eventId: event.id,
    });
  } catch (error) {
    // Dacă semnătura nu e validă, returnează 400
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

    // Obține informații despre sesiune
    const session = await stripeService.getSessionStatus(sessionId);

    return res.status(200).json({
      success: true,
      session: {
        id: session.id,
        status: session.payment_status, // paid, unpaid, no_payment_required
        amountTotal: session.amount_total,
        currency: session.currency,
        customerEmail: session.customer_email,
        paymentIntentId: session.payment_intent?.id,
        clientId: session.metadata?.clientId,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Health check endpoint
 * 
 * URL: GET /api/payment/health
 * Folosit pentru a verifica dacă API-ul este activ
 */
function healthCheck(req, res) {
  return res.status(200).json({
    success: true,
    message: 'Payment API este activ',
    timestamp: new Date().toISOString(),
  });
}

// Exportă toți controlerii
module.exports = {
  createCheckout,
  handleWebhook,
  getCheckoutStatus,
  healthCheck,
};
