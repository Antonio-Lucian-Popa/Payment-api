/**
 * ERROR HANDLER MIDDLEWARE
 * ========================
 * Middleware care centralizează tratarea erorilor
 * Orice eroare din aplicație va fi preluată și formatată uniform
 */

/**
 * Middleware de error handling
 * 
 * @param {Error} err - Obiectul erorii
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function (nu se folosește, dar trebuie specificat)
 */
function errorHandler(err, req, res, next) {
  // Log-ul erorii în consolă pentru debug
  console.error('❌ EROARE:', {
    message: err.message,
    status: err.statusCode || 500,
    type: err.type || 'Unknown',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Determină codul HTTP și mesajul pentru client
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errorType = 'INTERNAL_ERROR';

  // ERORI STRIPE
  if (err.type === 'StripeInvalidRequestError') {
    statusCode = 400;
    message = `Eroare Stripe: ${err.message}`;
    errorType = 'STRIPE_ERROR';
  } 
  // ERORI DE VALIDARE
  else if (err.statusCode === 400) {
    statusCode = 400;
    message = err.message;
    errorType = 'VALIDATION_ERROR';
  }
  // ERORI DE AUTENTIFICARE
  else if (err.statusCode === 401) {
    statusCode = 401;
    message = 'Neautorizat';
    errorType = 'UNAUTHORIZED';
  }
  // ERORI DE AUTORIZARE
  else if (err.statusCode === 403) {
    statusCode = 403;
    message = 'Acces interzis';
    errorType = 'FORBIDDEN';
  }
  // ERORI NOT FOUND
  else if (err.statusCode === 404) {
    statusCode = 404;
    message = 'Resursa nu a fost găsită';
    errorType = 'NOT_FOUND';
  }

  // Trimite răspunsul cu eroarea
  res.status(statusCode).json({
    success: false,
    error: message,
    errorType: errorType,
    // În development, include și stack trace pentru debug
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err,
    }),
  });
}

// Exportă middleware-ul
module.exports = errorHandler;
