# PAYMENT API - GUIDA DE SETUP & CONFIGURARE

## 🚀 QUICK START

### 1. Instalare

```bash
cd /home/asu/Desktop/workspace/payment-api
npm install
```

### 2. Configurare Stripe

1. **Creează cont Stripe** (dacă nu ai deja):
   - Du-te pe https://dashboard.stripe.com
   - Înregistrează-te și confirmă email-ul

2. **Obține API Keys**:
   - Settings > API Keys
   - Copy Secret Key și Publishable Key
   - Nu partaja Secret Key!

3. **Obține Webhook Secret**:
   - Settings > Webhooks > Add endpoint
   - URL: `http://localhost:3000/api/payment/webhook` (pentru testing local)
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`
   - Copy webhook secret

4. **Creează fișierul .env**:

```bash
cp .env.example .env
```

Editează `.env` și adaugă:

```env
STRIPE_SECRET_KEY=sk_test_51K...  # Cheia ta secretă
STRIPE_PUBLISHABLE_KEY=pk_test_51K...  # Cheia publică
STRIPE_WEBHOOK_SECRET=whsec_...  # Webhook secret
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8080
```

### 3. Pornire Server

```bash
npm run dev    # Modul development (cu reload automat)
# sau
npm start      # Modul producție
```

Serverul va fi activ pe: **http://localhost:3000**

---

## 📚 API ENDPOINTS

### 1. Health Check
```
GET /api/payment/health

Response:
{
  "success": true,
  "message": "Payment API este activ",
  "timestamp": "2026-03-22T..."
}
```

### 2. Create Checkout Session
```
POST /api/payment/checkout

Headers:
  Content-Type: application/json

Body:
{
  "items": [
    {
      "name": "Produs",
      "description": "Descriere",
      "price": 9999,          # în bani (99.99 RON)
      "currency": "ron",
      "quantity": 1
    }
  ],
  "successUrl": "https://app.com/success",
  "cancelUrl": "https://app.com/cancel",
  "clientId": "user123"       # optional
}

Response:
{
  "success": true,
  "sessionId": "cs_test_...",
  "checkoutUrl": "https://checkout.stripe.com/...",
  "message": "Sesiune de checkout creată cu succes"
}
```

### 3. Check Payment Status
```
GET /api/payment/status/:sessionId

Response:
{
  "success": true,
  "session": {
    "id": "cs_test_...",
    "status": "paid",        # paid, unpaid, no_payment_required
    "amountTotal": 9999,
    "currency": "ron",
    "customerEmail": "user@example.com"
  }
}
```

### 4. Webhook Endpoint (Stripe → API)
```
POST /api/payment/webhook

Headers:
  stripe-signature: t=...,v1=...

Body: Stripe event (JSON)

Response:
{
  "success": true,
  "received": true,
  "eventType": "checkout.session.completed"
}
```

---

## 🧪 TESTING CU CURL

### Test 1: Health Check
```bash
curl http://localhost:3000/api/payment/health
```

### Test 2: Create Checkout
```bash
curl -X POST http://localhost:3000/api/payment/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "name": "Test Product",
        "description": "Produs test",
        "price": 2999,
        "currency": "ron",
        "quantity": 1
      }
    ],
    "successUrl": "http://localhost:3000",
    "cancelUrl": "http://localhost:3000",
    "clientId": "test-user-123"
  }'
```

**Output exemplu:**
```json
{
  "success": true,
  "sessionId": "cs_test_a1b2c3d4e5f6",
  "checkoutUrl": "https://checkout.stripe.com/pay/cs_test_a1b2c3d4e5f6",
  "message": "Sesiune de checkout creată cu succes"
}
```

### Test 3: Check Status
```bash
curl http://localhost:3000/api/payment/status/cs_test_a1b2c3d4e5f6
```

---

## 💡 INTEGRARE ÎN APLICAȚIE FRONTEND

### React Example:
```javascript
const response = await fetch('http://localhost:3000/api/payment/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    items: [
      { name: 'Laptop', price: 199900, currency: 'ron', quantity: 1 }
    ],
    successUrl: 'https://myapp.com/success',
    cancelUrl: 'https://myapp.com/cancel'
  })
});

const data = await response.json();
window.location.href = data.checkoutUrl;  // Redirecționează la Stripe
```

### Vue Example:
```javascript
async checkoutWithStripe() {
  const response = await this.$http.post('/api/payment/checkout', {
    items: this.cartItems,
    successUrl: `${window.location.origin}/success`,
    cancelUrl: `${window.location.origin}/cancel`
  });
  
  window.location.href = response.data.checkoutUrl;
}
```

---

## 🔐 TESTING CU STRIPE TEST CARDS

Când faci test pe Stripe Checkout, folosește aceste numere de card:

**Plată reușită:**
- Card: `4242 4242 4242 4242`
- Expiry: `12/34` (orice dată viitoare)
- CVC: `123` (orice 3 cifre)

**Plată eșuată:**
- Card: `4000 0000 0000 0002`
- Expiry: `12/34`
- CVC: `123`

---

## 📝 STRUCTURA PROIECTULUI

```
payment-api/
├── src/
│   ├── index.js                 # Entry point - pornește serverul
│   ├── config/
│   │   └── stripe.js            # Configurare Stripe SDK
│   ├── routes/
│   │   └── payment.js           # Definire rute API
│   ├── controllers/
│   │   └── paymentController.js # Logica endpoint-urilor
│   ├── services/
│   │   └── stripeService.js     # Logica Stripe
│   └── middleware/
│       └── errorHandler.js      # Tratare erori
├── .env                         # Variabile de mediu (NU adaugă în Git!)
├── .env.example                 # Template .env
├── .gitignore
├── package.json
├── README.md
└── EXAMPLES.js                  # Exemple de integrare
```

---

## 🔍 DEBUGGING

### Log-uri server:
Când pornești serverul cu `npm run dev`, vei vedea:

```
💳 PAYMENT API - STRIPE CHECKOUT SERVICE
✅ Server activ pe: http://localhost:3000
🔧 Mediu: development
🌐 CORS Origins: http://localhost:3000, ...
```

Fiecare request va fi logged:
```
📨 POST /api/payment/checkout - 2026-03-22T10:30:45.123Z
```

### Probleme comune:

1. **STRIPE_SECRET_KEY lipsă:**
   ```
   Error: STRIPE_SECRET_KEY nu este definit
   ```
   ✅ Soluție: Completează .env cu cheile Stripe

2. **CORS Error:**
   ```
   Access to XMLHttpRequest has been blocked by CORS policy
   ```
   ✅ Soluție: Adaugă origin-ul în ALLOWED_ORIGINS din .env

3. **Webhook secret invalid:**
   ```
   StripeSignatureVerificationError: No signatures found matching
   ```
   ✅ Soluție: Verifică că STRIPE_WEBHOOK_SECRET este corect

---

## 🚀 DEPLOYMENT

### Heroku:
```bash
# Creează app
heroku create payment-api-prod

# Setează variabile de mediu
heroku config:set STRIPE_SECRET_KEY=sk_live_...
heroku config:set STRIPE_WEBHOOK_SECRET=whsec_...

# Deploy
git push heroku main
```

### Environment variables pe prod:
- Asigură-te că folosești live keys (nu test keys)
- Actualizează ALLOWED_ORIGINS cu domeniul tău
- Configurează webhook URL în Stripe Dashboard

---

## 📞 SUPORT STRIPE

- **Docs**: https://stripe.com/docs
- **Status**: https://status.stripe.com
- **Support**: https://support.stripe.com

---

## ✅ CHECKLIST SETUP

- [ ] Cont Stripe creat și verificat
- [ ] API Keys obținute (Secret + Publishable)
- [ ] Webhook Secret obținut
- [ ] Fișier .env configurat
- [ ] npm install executat
- [ ] Server pornit cu npm run dev
- [ ] Health check testat (GET /api/payment/health)
- [ ] Checkout session creat (POST /api/payment/checkout)
- [ ] Test card folosit din Stripe docs
- [ ] Webhook configurat în Stripe Dashboard

---

**API este gata pentru utilizare! 🎉**
