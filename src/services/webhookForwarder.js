/**
 * WEBHOOK FORWARDER
 * =================
 * După ce un eveniment Stripe este verificat, îl retransmite (forward) către
 * backend-urile aplicațiilor consumatoare, ca acestea să reacționeze
 * (actualizare DB, trimitere email, activare acces, etc.).
 *
 * Caracteristici:
 *  - configurabil prin variabile de mediu (poate fi complet dezactivat);
 *  - non-blocant: nu întârzie răspunsul 200 către Stripe (fire-and-forget);
 *  - retry cu backoff exponențial și timeout per request;
 *  - semnătură HMAC-SHA256 opțională, ca destinatarul să verifice autenticitatea.
 *
 * Variabile de mediu:
 *  - WEBHOOK_FORWARD_URL      Lista de URL-uri (separate prin virgulă) către care
 *                             se retransmit evenimentele. Gol = forwarding dezactivat.
 *  - WEBHOOK_FORWARD_SECRET   Secret pentru semnătura HMAC (opțional, recomandat).
 *  - WEBHOOK_FORWARD_EVENTS   Filtru de tipuri de evenimente (separate prin virgulă).
 *                             Gol = retransmite toate evenimentele.
 *  - WEBHOOK_FORWARD_TIMEOUT_MS  Timeout per request (implicit 5000).
 *  - WEBHOOK_FORWARD_RETRIES     Număr de reîncercări la eșec (implicit 2).
 */

const crypto = require('crypto');

function getUrls() {
  return (process.env.WEBHOOK_FORWARD_URL || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function getEventFilter() {
  return (process.env.WEBHOOK_FORWARD_EVENTS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Forwarding activ dacă există cel puțin un URL configurat.
 * @returns {boolean}
 */
function isEnabled() {
  return getUrls().length > 0;
}

/**
 * Verifică dacă un tip de eveniment trebuie retransmis (conform filtrului).
 * @param {string} eventType
 * @returns {boolean}
 */
function shouldForward(eventType) {
  const filter = getEventFilter();
  return filter.length === 0 || filter.includes(eventType);
}

/**
 * Semnează payload-ul cu HMAC-SHA256. Returnează null dacă nu e configurat secret.
 * @param {string} payload
 * @returns {string|null} ex: "sha256=abcdef..."
 */
function sign(payload) {
  const secret = process.env.WEBHOOK_FORWARD_SECRET;
  if (!secret) {
    return null;
  }
  const digest = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `sha256=${digest}`;
}

/**
 * POST cu retry și backoff exponențial. Nu aruncă erori - le loghează.
 * @param {string} url
 * @param {string} body
 * @param {Object} headers
 */
async function postWithRetry(url, body, headers) {
  const timeoutMs = parseInt(process.env.WEBHOOK_FORWARD_TIMEOUT_MS, 10) || 5000;
  const maxRetries = parseInt(process.env.WEBHOOK_FORWARD_RETRIES, 10) || 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        return;
      }
      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      clearTimeout(timer);

      if (attempt === maxRetries) {
        console.error(
          `❌ Webhook forward eșuat pentru ${url} după ${attempt + 1} încercări:`,
          err.message
        );
        return;
      }

      const backoff = 500 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }
}

/**
 * Retransmite un eveniment Stripe către toate destinațiile configurate.
 * Fire-and-forget: pornește request-urile fără a aștepta finalizarea lor,
 * ca răspunsul către Stripe să nu fie întârziat.
 *
 * @param {Object} event - evenimentul Stripe verificat
 */
function forwardEvent(event) {
  const urls = getUrls();

  if (urls.length === 0 || !shouldForward(event.type)) {
    return;
  }

  const body = JSON.stringify({
    id: event.id,
    type: event.type,
    created: event.created,
    data: event.data,
  });

  const signature = sign(body);

  const headers = {
    'Content-Type': 'application/json',
    'x-payment-event': event.type,
    'x-payment-event-id': event.id,
    ...(signature ? { 'x-payment-signature': signature } : {}),
  };

  for (const url of urls) {
    // Fire-and-forget: nu așteptăm și nu propagăm erorile.
    postWithRetry(url, body, headers).catch(() => {});
  }
}

module.exports = {
  isEnabled,
  shouldForward,
  sign,
  forwardEvent,
};
