/**
 * MAIN APPLICATION FILE (ENTRY POINT)
 * ===================================
 * Inițializează serverul Express și configurează toate rutele și middleware-urile
 * Acesta este fișierul care se execută prin `npm start` sau `npm run dev`
 */

// ==================== IMPORTS ====================

// Variabile de mediu din .env
require('dotenv').config();

// Framework Express - server web
const express = require('express');

// CORS - permite request-uri din alte domenii (necesare pentru integrare în mai multe app-uri)
const cors = require('cors');

// Body Parser - parsează request body-ul
const bodyParser = require('body-parser');

// Import rute de plată
const paymentRoutes = require('./routes/payment');

// Import middleware de error handling
const errorHandler = require('./middleware/errorHandler');

// ==================== CONFIGURARE ====================

// Creează aplicația Express
const app = express();

// Port pe care va asculta serverul (din .env sau implicit 3000)
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ==================== MIDDLEWARE ====================

// MIDDLEWARE BODY PARSER (pentru webhook-uri Stripe)
// IMPORTANT: Webhook-ul Stripe necesită body RAW pentru a verifica semnătura
// Deci trebuie să stocăm body-ul raw înainte ca Express să-l parseze

// Middleware custom pentru stocarea body raw
app.use((req, res, next) => {
  if (req.path === '/api/payment/webhook') {
    // Pentru webhook, salvează body-ul raw
    let data = '';
    req.on('data', chunk => {
      data += chunk.toString();
    });
    req.on('end', () => {
      req.rawBody = data;
      next();
    });
  } else {
    // Pentru alte rute, continuă normal
    next();
  }
});

// Parsează JSON din request body (pentru rute normale)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// CORS - Configurare pentru a permite request-uri din alte domenii
// Acest lucru este ESENȚIAL pentru integrare în mai multe aplicații
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

app.use(cors({
  origin: function (origin, callback) {
    // Dacă nu există origin (request din server side), permite
    if (!origin) {
      return callback(null, true);
    }

    // Dacă origin-ul este în lista permitere
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Altfel, returnează eroare CORS
      callback(new Error('CORS policy: Origin not allowed'));
    }
  },
  credentials: true, // Permite cookies și headers de autentificare
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'stripe-signature'],
}));

// ==================== LOGGING ====================

// Middleware pentru logging request-urilor
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// ==================== RUTE ====================

// ROOT ENDPOINT - Status general al API-ului
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Payment API v1.0.0 - Generic Stripe Checkout Service',
    version: '1.0.0',
    endpoints: [
      'POST /api/payment/checkout - Crează sesiune checkout',
      'POST /api/payment/checkout/subscription - Crează abonament lunar',
      'POST /api/payment/webhook - Primește webhook-uri Stripe',
      'GET /api/payment/status/:sessionId - Obține status plată',
      'GET /api/payment/health - Health check',
    ],
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// RUTE DE PLATĂ
// Toate rutele de plată sunt prefixate cu /api/payment
app.use('/api/payment', paymentRoutes);

// ==================== 404 HANDLER ====================

// Dacă nicio rută nu s-a potrivit, returnează 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Ruta ${req.method} ${req.path} nu a fost găsită`,
    hint: 'Consultă GET / pentru lista de endpoint-uri disponibile',
  });
});

// ==================== ERROR HANDLER ====================

// Middleware global pentru tratarea erorilor
// IMPORTANT: Trebuie să fie ULTIMUL middleware!
app.use(errorHandler);

// ==================== START SERVER ====================

// Pornește serverul și asculță pe port-ul configurat
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║        💳 PAYMENT API - STRIPE CHECKOUT SERVICE        ║
╚════════════════════════════════════════════════════════╝

✅ Server activ pe: http://localhost:${PORT}
🔧 Mediu: ${NODE_ENV}
🌐 CORS Origins: ${allowedOrigins.join(', ')}

📚 API Documentation:
  - GET /                        - Root endpoint & documentation
  - POST /api/payment/checkout   - Create checkout session
  - POST /api/payment/checkout/subscription - Create monthly subscription
  - POST /api/payment/webhook    - Stripe webhook handler
  - GET /api/payment/status/:id  - Check payment status
  - GET /api/payment/health      - Health check

🔐 Configurare Stripe:
  - Cheie secretă: ${process.env.STRIPE_SECRET_KEY ? '✅ Configurată' : '❌ Lipsă'}
  - Webhook secret: ${process.env.STRIPE_WEBHOOK_SECRET ? '✅ Configurat' : '❌ Lipsă'}

⚠️  Importante:
  - Copiază .env.example în .env și completează cu cheile Stripe
  - Configurează webhook-ul în Stripe Dashboard
  - CORS este configurat pentru: ${allowedOrigins.join(', ')}

╔════════════════════════════════════════════════════════╗
  `);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM primit, opresc serverul...');
  process.exit(0);
});

// Exportă aplicația (util pentru testing)
module.exports = app;
