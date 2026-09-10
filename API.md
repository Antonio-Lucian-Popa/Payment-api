# 📘 API & Integrare Frontend — Payment API

Referință completă a endpoint-urilor și ghid de integrare pentru aplicațiile care folosesc acest serviciu de plăți.

> Acesta este documentul autoritar pentru integrare. Exemplele mai vechi din `EXAMPLES.js` sunt păstrate pentru referință, dar acest fișier reflectă comportamentul curent (inclusiv autentificarea prin API key).

---

## 🔗 Base URL

| Mediu | URL |
|-------|-----|
| Local | `http://localhost:3000/api/payment` |
| Producție | `https://domeniul-tau.ro/api/payment` |

Toate exemplele de mai jos presupun o variabilă:

```js
const PAYMENT_API_URL = 'http://localhost:3000/api/payment';
```

---

## 🔐 Autentificare

Dacă serviciul rulează cu `API_KEY` setat în `.env`, **fiecare** request către rutele de plată trebuie să includă header-ul:

```
x-api-key: <valoarea din API_KEY>
```

| Rută | Necesită `x-api-key`? |
|------|:--:|
| `POST /checkout` | ✅ |
| `POST /checkout/subscription` | ✅ |
| `GET /status/:sessionId` | ✅ |
| `GET /health` | ❌ |
| `POST /webhook` | ❌ (autentificat prin semnătura Stripe) |

Dacă `API_KEY` **nu** este setat, autentificarea este dezactivată (util în dezvoltare). Un request fără cheie validă când `API_KEY` este setat primește `401`.

> ⚠️ API key-ul este un secret partajat între **backend-urile** tale și acest serviciu. NU îl expune în cod frontend public (browser). Frontend-ul public ar trebui să apeleze propriul backend, care la rândul lui apelează Payment API cu cheia.

---

## 🚦 Rate limiting

Rutele `/api/payment/*` (mai puțin `/webhook`) sunt limitate per IP. Configurabil prin `RATE_LIMIT_WINDOW_MINUTES` (implicit 15) și `RATE_LIMIT_MAX_REQUESTS` (implicit 100).

La depășire primești `429` și headerele standard `RateLimit-*`:

```json
{ "success": false, "error": "Prea multe request-uri. Te rog încearcă din nou mai târziu.", "errorType": "RATE_LIMIT_EXCEEDED" }
```

---

## 💰 Format sume

Prețurile se trimit în **cea mai mică unitate a monedei** (bani/cenți), ca **număr întreg**.

| Sumă reală | Trimiți |
|-----------|---------|
| 19,99 RON | `1999` |
| 199,00 RON | `19900` |
| 9,99 EUR | `999` |

---

## 📋 Endpoint-uri

| Metodă | Rută | Descriere |
|--------|------|-----------|
| `GET` | `/` | Documentație & status (root, în afara prefixului `/api/payment`) |
| `POST` | `/api/payment/checkout` | Creează sesiune de checkout (one-time sau monthly) |
| `POST` | `/api/payment/checkout/subscription` | Creează abonament lunar |
| `POST` | `/api/payment/webhook` | Primește evenimente Stripe |
| `GET` | `/api/payment/status/:sessionId` | Status-ul unei sesiuni |
| `GET` | `/api/payment/health` | Health check |

---

### `POST /api/payment/checkout`

Creează o sesiune de checkout Stripe și returnează URL-ul de redirecționare.

**Headers**
```
Content-Type: application/json
x-api-key: <API_KEY>        # doar dacă API_KEY este setat
```

**Body**

| Câmp | Tip | Obligatoriu | Descriere |
|------|-----|:--:|-----------|
| `items` | `Item[]` | ✅ | Cel puțin un produs |
| `successUrl` | `string` | ✅ | URL de redirect după succes |
| `cancelUrl` | `string` | ✅ | URL de redirect după anulare |
| `clientId` | `string` | ➖ | Identificator propriu (ajunge în metadata) |
| `billingType` | `"one_time" \| "monthly"` | ➖ | Implicit `one_time` |
| `customerEmail` | `string` | ➖ | Pre-completează emailul în Stripe |

**`Item`**

| Câmp | Tip | Obligatoriu | Note |
|------|-----|:--:|------|
| `name` | `string` | ✅ | |
| `price` | `number` | ✅ | Întreg pozitiv, în bani/cenți |
| `currency` | `string` | ✅ | Ex: `ron`, `eur`, `usd` |
| `description` | `string` | ➖ | |
| `quantity` | `number` | ➖ | Implicit 1. Pentru `monthly` trebuie să fie 1 |

**Exemplu request**
```json
{
  "items": [
    { "name": "Laptop", "description": "MacBook Pro 16\"", "price": 199900, "currency": "ron", "quantity": 1 }
  ],
  "successUrl": "https://myapp.com/success?session_id={CHECKOUT_SESSION_ID}",
  "cancelUrl": "https://myapp.com/cancel",
  "clientId": "user-123"
}
```

**Răspuns `200`**
```json
{
  "success": true,
  "sessionId": "cs_test_a1b2c3...",
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_a1b2c3...",
  "mode": "payment",
  "billingType": "one_time",
  "message": "Sesiune de checkout creată cu succes"
}
```

> 💡 Include `{CHECKOUT_SESSION_ID}` în `successUrl` — Stripe îl înlocuiește automat cu ID-ul real, deci frontend-ul îl poate citi din URL pentru a verifica status-ul.

---

### `POST /api/payment/checkout/subscription`

Identic cu `/checkout`, dar forțează `billingType = "monthly"` (mod `subscription`). `quantity` trebuie să fie 1.

**Răspuns `200`**
```json
{
  "success": true,
  "sessionId": "cs_test_...",
  "checkoutUrl": "https://checkout.stripe.com/c/pay/...",
  "mode": "subscription",
  "billingType": "monthly",
  "message": "Sesiune de abonament lunar creată cu succes"
}
```

---

### `GET /api/payment/status/:sessionId`

Returnează status-ul unei sesiuni de checkout.

**Răspuns `200`**
```json
{
  "success": true,
  "session": {
    "id": "cs_test_...",
    "mode": "payment",
    "status": "paid",
    "amountTotal": 199900,
    "currency": "ron",
    "customerEmail": "client@example.com",
    "paymentIntentId": "pi_...",
    "subscriptionId": null,
    "clientId": "user-123",
    "billingType": "one_time"
  }
}
```

`status` reflectă `payment_status` din Stripe: de regulă `paid`, `unpaid` sau `no_payment_required`.

---

### `POST /api/payment/webhook`

Primește evenimente de la Stripe. Nu este apelat de frontend, ci de Stripe.

**Headers**
```
stripe-signature: <semnătura trimisă de Stripe>
```

**Răspuns `200`**
```json
{ "success": true, "received": true, "eventType": "checkout.session.completed", "eventId": "evt_..." }
```

Fără header-ul `stripe-signature` sau cu semnătură invalidă → `400`.

Evenimente tratate: `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `checkout.session.async_payment_succeeded/failed`, `invoice.paid`, `invoice.payment_failed`, `charge.failed`.

---

## 📡 Webhook forwarding către backend-ul tău

Payment API este fără stare — nu scrie în DB și nu trimite email-uri. Ca aplicația ta să reacționeze la plăți, serviciul poate **retransmite** evenimentele Stripe verificate către unul sau mai multe backend-uri ale tale.

**Activare** — setează în `.env`:

```env
WEBHOOK_FORWARD_URL=https://app1.ro/webhooks/payments,https://app2.ro/hooks/stripe
WEBHOOK_FORWARD_SECRET=un-secret-partajat        # opțional, recomandat
WEBHOOK_FORWARD_EVENTS=checkout.session.completed,invoice.paid  # opțional; gol = toate
WEBHOOK_FORWARD_TIMEOUT_MS=5000
WEBHOOK_FORWARD_RETRIES=2
```

Dacă `WEBHOOK_FORWARD_URL` este gol, forwarding-ul este dezactivat.

**Comportament**
- Retransmiterea are loc **doar după** verificarea semnăturii Stripe.
- Este **non-blocantă** (fire-and-forget) — nu întârzie răspunsul `200` către Stripe.
- Reîncearcă la eșec cu backoff exponențial (`WEBHOOK_FORWARD_RETRIES`), cu timeout per request.
- Trimite în paralel către toate URL-urile configurate.

**Ce primește backend-ul tău** — un `POST` cu:

| Header | Descriere |
|--------|-----------|
| `Content-Type` | `application/json` |
| `x-payment-event` | Tipul evenimentului (ex: `checkout.session.completed`) |
| `x-payment-event-id` | ID-ul evenimentului Stripe (`evt_...`) — util pentru idempotență |
| `x-payment-signature` | `sha256=<hmac>` peste body (doar dacă `WEBHOOK_FORWARD_SECRET` e setat) |

Body:
```json
{
  "id": "evt_...",
  "type": "checkout.session.completed",
  "created": 1690000000,
  "data": { "object": { "...": "obiectul Stripe relevant" } }
}
```

**Verificarea semnăturii la tine în backend (Node.js)**
```js
const crypto = require('crypto');

app.post('/webhooks/payments', express.json(), (req, res) => {
  const secret = process.env.WEBHOOK_FORWARD_SECRET;
  const received = req.headers['x-payment-signature'];
  const expected =
    'sha256=' + crypto.createHmac('sha256', secret)
      .update(JSON.stringify(req.body)).digest('hex');

  if (received !== expected) {
    return res.status(401).json({ error: 'Semnătură invalidă' });
  }

  // Idempotență: ignoră dacă ai procesat deja req.headers['x-payment-event-id']
  if (req.body.type === 'checkout.session.completed') {
    // marchează comanda ca plătită, trimite email, generează factura...
  }

  res.json({ received: true });
});
```

> ℹ️ Verificarea recalculează HMAC peste `JSON.stringify(req.body)`. Pentru semnătură criptografic exactă (fără reserializare), verifică peste raw body — dar în practică `JSON.stringify` al aceluiași obiect e suficient dacă ambele părți folosesc Node/JSON standard.

---

### `GET /api/payment/health`

```json
{ "success": true, "message": "Payment API este activ", "timestamp": "2026-09-10T07:39:31.006Z" }
```

---

## ❌ Format erori

Toate erorile au aceeași formă:

```json
{ "success": false, "error": "mesaj", "errorType": "TIP_EROARE" }
```

| Status | `errorType` | Când apare |
|:--:|-------------|-----------|
| `400` | `VALIDATION_ERROR` | Body invalid (items lipsă, preț negativ, etc.) |
| `400` | `STRIPE_ERROR` | Stripe a respins cererea |
| `401` | `UNAUTHORIZED` | `x-api-key` lipsă/invalid |
| `404` | `NOT_FOUND` | Rută inexistentă |
| `429` | `RATE_LIMIT_EXCEEDED` | Prea multe request-uri |
| `500` | `INTERNAL_ERROR` | Eroare neașteptată |

În `NODE_ENV=development` răspunsul de eroare include și `stack` + `details`.

---

## 🖥️ Integrare Frontend

### 1. Vanilla JS (`fetch`)

```js
const PAYMENT_API_URL = 'http://localhost:3000/api/payment';

async function checkout(items) {
  const res = await fetch(`${PAYMENT_API_URL}/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // 'x-api-key': API_KEY,   // vezi nota de securitate de mai jos
    },
    body: JSON.stringify({
      items,
      successUrl: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${window.location.origin}/cancel`,
      clientId: `user-${Date.now()}`,
    }),
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.error);

  window.location.href = data.checkoutUrl; // redirect la Stripe
}
```

### 2. React

```jsx
import { useState } from 'react';

const PAYMENT_API_URL = import.meta.env.VITE_PAYMENT_API_URL;

export function CheckoutButton({ items }) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${PAYMENT_API_URL}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          successUrl: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/cancel`,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      window.location.href = data.checkoutUrl;
    } catch (e) {
      alert(`Eroare: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleCheckout} disabled={loading}>
      {loading ? 'Se procesează…' : 'Plătește cu Stripe'}
    </button>
  );
}
```

### 3. Verificarea status-ului după plată

```js
// pe pagina /success
const sessionId = new URLSearchParams(window.location.search).get('session_id');
if (sessionId) {
  const res = await fetch(`${PAYMENT_API_URL}/status/${sessionId}`);
  const { session } = await res.json();
  if (session.status === 'paid') {
    // marchează comanda ca plătită în UI
  }
}
```

---

## 🔒 Nota de securitate: unde pui `x-api-key`

Când `API_KEY` este activat, cheia **nu trebuie pusă în frontend public** (ar fi vizibilă oricui). Pattern recomandat:

```
Browser  ──►  Backend-ul tău  ──(x-api-key)──►  Payment API  ──►  Stripe
```

Backend-ul tău (Node, PHP, etc.) păstrează cheia în variabile de mediu și o adaugă la request:

```js
// Backend-ul tău (Node.js)
const res = await fetch(`${PAYMENT_API}/checkout`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.PAYMENT_API_KEY,
  },
  body: JSON.stringify({ items, successUrl, cancelUrl, clientId: userId }),
});
```

Dacă frontend-ul apelează direct Payment API (SPA fără backend), lasă `API_KEY` gol și bazează-te pe `ALLOWED_ORIGINS` (CORS) + rate limiting.

---

## 🧪 Testare rapidă cu curl

```bash
# Health
curl http://localhost:3000/api/payment/health

# Checkout (cu API key, dacă e activat)
curl -X POST http://localhost:3000/api/payment/checkout \
  -H "Content-Type: application/json" \
  -H "x-api-key: CHEIA_TA" \
  -d '{
    "items": [{ "name": "Laptop", "price": 199900, "currency": "ron", "quantity": 1 }],
    "successUrl": "https://myapp.com/success",
    "cancelUrl": "https://myapp.com/cancel",
    "clientId": "user-123"
  }'

# Status
curl http://localhost:3000/api/payment/status/cs_test_xxx -H "x-api-key: CHEIA_TA"
```

Pentru webhook local folosește Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/payment/webhook
```

---

## 🔄 Flow complet

```
1. FE adaugă produse în coș
2. FE (sau backend-ul tău) → POST /checkout → primește checkoutUrl
3. Redirect user la Stripe Checkout
4. User plătește → Stripe redirect la successUrl / cancelUrl
5. FE citește session_id din URL → GET /status/:id (confirmare UI)
6. Stripe → POST /webhook (sursa de adevăr pentru backend: DB, email, factură)
```

> Payment API este **generic și fără stare** — nu stochează comenzi. Logica de business (DB, email, facturi) rămâne în aplicația ta, declanșată de webhook.
