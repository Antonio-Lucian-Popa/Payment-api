/**
 * PAYMENT ROUTES
 * ==============
 * Definește rutele (endpoints) pentru API-ul de plăți
 * Conectează HTTP request-urile la funcțiile din controller
 */

const express = require('express');
const paymentController = require('../controllers/paymentController');

// Creează router-ul Express
const router = express.Router();

/**
 * POST /api/payment/checkout
 * Crează o sesiune de checkout Stripe
 * 
 * Body exemplu:
 * {
 *   "items": [
 *     {
 *       "name": "Laptop",
 *       "description": "MacBook Pro",
 *       "price": 199900,
 *       "currency": "ron",
 *       "quantity": 1
 *     }
 *   ],
 *   "successUrl": "https://myapp.com/success",
 *   "cancelUrl": "https://myapp.com/cancel",
 *   "clientId": "user123"
 * }
 */
router.post('/checkout', paymentController.createCheckout);

/**
 * POST /api/payment/webhook
 * Primește evenimentele Stripe
 * 
 * Headers: stripe-signature (semnătura pentru verificare autenticitate)
 * Body: Evenimentul Stripe (JSON)
 * 
 * IMPORTANT: Trebuie configurat în Stripe Dashboard:
 * Settings > Webhooks > Add Endpoint
 * URL: https://your-domain.com/api/payment/webhook
 * Events: checkout.session.completed, checkout.session.async_payment_succeeded, etc
 */
router.post('/webhook', paymentController.handleWebhook);

/**
 * GET /api/payment/status/:sessionId
 * Obține statusul unei sesiuni de checkout
 * 
 * Params: sessionId (ID-ul sesiunii Stripe)
 * 
 * Response: 
 * {
 *   "success": true,
 *   "session": {
 *     "id": "cs_test_...",
 *     "status": "paid",
 *     "amountTotal": 199900,
 *     "currency": "ron"
 *   }
 * }
 */
router.get('/status/:sessionId', paymentController.getCheckoutStatus);

/**
 * GET /api/payment/health
 * Verifică dacă API-ul de plăți este activ
 * Util pentru monitoring și health checks
 */
router.get('/health', paymentController.healthCheck);

// Exportă router-ul pentru a fi folosit în aplicația principală
module.exports = router;
