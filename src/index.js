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

// Helmet - setează headere HTTP de securitate
const helmet = require('helmet');

// Rate limiting - protejează împotriva abuzului / brute-force
const rateLimit = require('express-rate-limit');

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

// SECURITATE - headere HTTP sigure (Helmet)
app.use(helmet());

// WEBHOOK RAW BODY (pentru verificarea semnăturii Stripe)
// IMPORTANT: Webhook-ul Stripe necesită body RAW (Buffer) pentru a verifica
// semnătura. Montăm express.raw DOAR pe ruta de webhook, ÎNAINTE de parser-ul
// JSON. express.raw setează req._body = true, deci parser-ul JSON de mai jos
// va sări automat peste această rută.
app.use('/api/payment/webhook', express.raw({ type: '*/*' }));

// Parsează JSON din request body (pentru rutele normale)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// RATE LIMITING pentru rutele de plată
// Protejează împotriva abuzului. Configurabil prin variabile de mediu.
const rateLimitWindowMinutes = parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES, 10) || 15;
const rateLimitMaxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100;

const paymentLimiter = rateLimit({
  windowMs: rateLimitWindowMinutes * 60 * 1000,
  max: rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  // Webhook-urile Stripe pot fi frecvente și sunt autentificate prin semnătură,
  // deci le excludem din rate limiting.
  skip: (req) => req.path === '/webhook',
  message: {
    success: false,
    error: 'Prea multe request-uri. Te rog încearcă din nou mai târziu.',
    errorType: 'RATE_LIMIT_EXCEEDED',
  },
});

// RUTE DE PLATĂ
// Toate rutele de plată sunt prefixate cu /api/payment
app.use('/api/payment', paymentLimiter, paymentRoutes);

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

// Pornește serverul și asculță pe port-ul configurat.
// În timpul testelor (NODE_ENV=test) NU pornim serverul - importăm doar `app`.
if (process.env.NODE_ENV !== 'test') {
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
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM primit, opresc serverul...');
  process.exit(0);
});

// Exportă aplicația (util pentru testing)
module.exports = app;
