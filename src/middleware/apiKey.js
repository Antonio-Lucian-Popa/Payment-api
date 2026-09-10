/**
 * API KEY MIDDLEWARE
 * ==================
 * Autentificare simplă bazată pe un API key partajat între aplicațiile tale
 * și acest serviciu de plăți.
 *
 * Activare: setează variabila de mediu `API_KEY`.
 * Dacă `API_KEY` NU este setat, middleware-ul este dezactivat (util în dev),
 * dar loghează un avertisment în producție.
 *
 * Rutele exceptate (health check, webhook) nu trec prin acest middleware,
 * pentru că webhook-ul este autentificat separat prin semnătura Stripe.
 */

const configuredKey = process.env.API_KEY;

if (!configuredKey && process.env.NODE_ENV === 'production') {
  console.warn(
    '⚠️  API_KEY nu este setat în producție - endpoint-urile de plată sunt PUBLICE. ' +
    'Setează API_KEY în .env pentru a le proteja.'
  );
}

/**
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function apiKeyAuth(req, res, next) {
  // Dacă nu e configurat niciun API key, sări peste autentificare
  if (!configuredKey) {
    return next();
  }

  const providedKey = req.headers['x-api-key'];

  if (!providedKey || providedKey !== configuredKey) {
    return res.status(401).json({
      success: false,
      error: 'API key invalid sau lipsă (header x-api-key)',
      errorType: 'UNAUTHORIZED',
    });
  }

  return next();
}

module.exports = apiKeyAuth;
