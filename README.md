# PAYMENT-API - Generic Payment Microservice

Backend API generic pentru procesarea plăților online utilizând Stripe Checkout. Poate fi integrat în orice aplicație.

## 🎯 Caracteristici

- ✅ API generic refolosibil
- ✅ Integrare Stripe Checkout
- ✅ Procesare de comenzi cu multiple produse
- ✅ Webhook handling pentru confirmări
- ✅ CORS enabled pentru integrare în mai multe aplicații
- ✅ Error handling robust

## 📁 Structura Proiectului

```
payment-api/
├── src/
│   ├── index.js                 # Entry point al aplicației
│   ├── config/
│   │   └── stripe.js           # Configurare Stripe
│   ├── routes/
│   │   └── payment.js          # Rute de plată
│   ├── controllers/
│   │   └── paymentController.js # Logica pentru plăți
│   ├── services/
│   │   └── stripeService.js    # Integrare Stripe
│   └── middleware/
│       └── errorHandler.js     # Middleware pentru erori
├── .env.example                # Template pentru variabile de mediu
├── package.json
└── README.md
```

## 🚀 Instalare

1. **Clonează proiectul:**
```bash
cd /home/asu/Desktop/workspace/payment-api
npm install
```

2. **Configurare variabile de mediu:**
```bash
cp .env.example .env
# Edițează .env și adaugă cheile Stripe
```

3. **Pornire:**
```bash
npm run dev  # Modul development cu nodemon
npm start    # Modul producție
```

## 📚 API Endpoints

### 1. Create Checkout Session
**POST** `/api/payment/checkout`

Creeaza o sesiune de checkout Stripe.

**Request Body:**
```json
{
  "items": [
    {
      "name": "Produs 1",
      "description": "Descriere produs",
      "price": 2999,
      "currency": "ron",
      "quantity": 1
    }
  ],
  "successUrl": "https://your-app.com/success",
  "cancelUrl": "https://your-app.com/cancel",
  "clientId": "unique-client-identifier"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "cs_test_...",
  "checkoutUrl": "https://checkout.stripe.com/..."
}
```

### 2. Webhook Handler
**POST** `/api/payment/webhook`

Procesează evenimentele Stripe (confirmări de plată, etc).

### 3. Payment Status
**GET** `/api/payment/status/:sessionId`

Verifică statusul unei sesiuni de plată.

## 🔑 Variabile de Mediu

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PORT=3000
NODE_ENV=development
```

## 💡 Exemple de Utilizare

```javascript
// Client-side
const checkoutData = {
  items: [
    {
      name: "Laptop",
      description: "MacBook Pro 16\"",
      price: 199900, // în bani
      currency: "ron",
      quantity: 1
    },
    {
      name: "Mouse",
      description: "Magic Mouse",
      price: 3999,
      currency: "ron",
      quantity: 2
    }
  ],
  successUrl: "https://myapp.com/payment-success",
  cancelUrl: "https://myapp.com/payment-canceled"
};

// POST către /api/payment/checkout
const response = await fetch('http://localhost:3000/api/payment/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(checkoutData)
});

const data = await response.json();
// Redirecționează user la data.checkoutUrl
```

## 🔒 Securitate

- Validare date input
- Verificare webhook signature
- Error handling pentru operații Stripe
- CORS configurat pentru domenii specifice

## 📝 Note

- API este generic și nu stochează date în bază de date - toată logica este în Stripe
- Webhook-ul trebuie configurat în Stripe Dashboard
- Sumele sunt în cea mai mică unitate (bani pentru RON, cents pentru USD)

## 🎓 Integrare în alte aplicații

1. Instalează clientul Stripe: `npm install @stripe/stripe-js`
2. Folosește endpoint-ul `/api/payment/checkout`
3. Redirecționează la URL-ul primit în răspuns
4. Configurează webhook handling pe aplicația ta

---

**API URL**: http://localhost:3000
