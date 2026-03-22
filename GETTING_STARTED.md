# 💳 Payment API - Stripe Checkout Generic Microservice

Bun venit la Payment API! Aceasta este o **microserviciu generică și refolosibilă** pentru procesarea plăților online cu Stripe Checkout.

## 📋 Ce este Payment API?

Un backend API **complet, generic și ready-to-use** care:

✅ **Creează sesiuni de checkout Stripe** pentru orice tip de produs/serviciu  
✅ **Acceptă multiple produse** în aceeași comandă  
✅ **Gestionează webhook-urile** Stripe automat  
✅ **Returează status-ul plăților** în timp real  
✅ **Este complet independent** - nu are bază de date  
✅ **Poate fi integrat în orice aplicație** (React, Vue, Angular, etc)  
✅ **Funcționează ca microserviciu** separat  

---

## 🎯 De ce Payment API?

### ❌ Fără API:
- Trebuie să implementezi Stripe în fiecare proiect
- Cod duplicat
- Greu de menținut
- Integrare complexă

### ✅ Cu Payment API:
- API generic - o dată și refolosești peste tot
- Separare de responsabilități
- Ușor de testat și updatat
- Integrare simplă via HTTP/REST

---

## 📦 Ce e inclus?

```
✅ Express.js backend          - Server web performant
✅ Stripe integration          - Toată logica Stripe
✅ Checkout handling           - Creere și management sesiuni
✅ Webhook support             - Primire eventos Stripe
✅ CORS configuration          - Multi-domain support
✅ Error handling              - Tratare erori uniformă
✅ Input validation            - Validare date
✅ Logging                     - Tracking request-uri
✅ Comentarii complete         - Cod ușor de înțeles
```

---

## 🚀 QUICK START - 5 MINUTE

### 1. Clonează/pornește proiectul:
```bash
cd /home/asu/Desktop/workspace/payment-api
npm install
```

### 2. Configurează .env:
```bash
cp .env.example .env
# Editează .env și adaugă cheile Stripe
```

### 3. Pornește server-ul:
```bash
npm run dev
```

**Serverul este activ pe:** `http://localhost:3000`

### 4. Testează health check:
```bash
curl http://localhost:3000/api/payment/health
```

---

## 📚 API Documentation

### Endpoint 1: Create Checkout Session
```
POST /api/payment/checkout
```

**Request:**
```json
{
  "items": [
    {
      "name": "Laptop Pro",
      "description": "MacBook Pro 16 inch",
      "price": 199900,        // în bani (1999.00 RON)
      "currency": "ron",
      "quantity": 1
    }
  ],
  "successUrl": "https://myapp.com/payment-success",
  "cancelUrl": "https://myapp.com/payment-cancel",
  "clientId": "user-123"      // opțional
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "cs_test_...",
  "checkoutUrl": "https://checkout.stripe.com/...",
  "message": "Sesiune de checkout creată cu succes"
}
```

### Endpoint 2: Check Payment Status
```
GET /api/payment/status/:sessionId
```

**Response:**
```json
{
  "success": true,
  "session": {
    "id": "cs_test_...",
    "status": "paid",         // paid, unpaid
    "amountTotal": 199900,
    "currency": "ron",
    "customerEmail": "user@example.com"
  }
}
```

### Endpoint 3: Webhook Handler
```
POST /api/payment/webhook

Headers:
  stripe-signature: t=...,v1=...
```

Primește evenimente Stripe (plată confirmată, eșuată, etc)

### Endpoint 4: Health Check
```
GET /api/payment/health
```

---

## 🔧 SETUP DETALIAT

### 1. Obține API Keys din Stripe

1. Du-te pe https://dashboard.stripe.com
2. **Settings > API Keys**
3. Copie:
   - Secret Key (sk_test_...)
   - Publishable Key (pk_test_...)

### 2. Obține Webhook Secret

1. **Settings > Webhooks**
2. **Add endpoint**
3. URL: `http://localhost:3000/api/payment/webhook` (local)
4. Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`
5. Copie webhook secret (whsec_...)

### 3. Configurează .env

```env
STRIPE_SECRET_KEY=sk_test_YOUR_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

---

## 💡 EXEMPLE DE INTEGRARE

### React Integration:
```javascript
async function checkout(cartItems) {
  const response = await fetch('http://localhost:3000/api/payment/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: cartItems,
      successUrl: window.location.origin + '/success',
      cancelUrl: window.location.origin + '/cancel'
    })
  });
  
  const data = await response.json();
  window.location.href = data.checkoutUrl;  // Merge la Stripe
}
```

### Vue Integration:
```javascript
async checkoutVue(items) {
  const response = await this.$http.post(
    'http://localhost:3000/api/payment/checkout',
    { items, successUrl: '...', cancelUrl: '...' }
  );
  window.location.href = response.data.checkoutUrl;
}
```

### Angular Integration:
```typescript
checkout(items: Product[]) {
  this.http.post('/api/payment/checkout', { items }).subscribe(
    (response: any) => {
      window.location.href = response.checkoutUrl;
    }
  );
}
```

---

## 🧪 TESTING

### Test Card Numbers (Stripe):
```
✅ Success:  4242 4242 4242 4242
❌ Decline:  4000 0000 0000 0002
```

Expiry: orice dată viitoare (ex: 12/34)  
CVC: orice 3 cifre (ex: 123)

### CURL Examples:

**Create checkout:**
```bash
curl -X POST http://localhost:3000/api/payment/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{
      "name": "Test Product",
      "price": 9999,
      "currency": "ron",
      "quantity": 1
    }],
    "successUrl": "http://localhost:3000",
    "cancelUrl": "http://localhost:3000"
  }'
```

**Check status:**
```bash
curl http://localhost:3000/api/payment/status/cs_test_abc123
```

---

## 📁 Project Structure

```
payment-api/
│
├── src/
│   ├── index.js                 # 🎯 Entry point - pornește serverul
│   │
│   ├── config/
│   │   └── stripe.js            # ⚙️ Configurare Stripe SDK
│   │
│   ├── routes/
│   │   └── payment.js           # 🛣️ Definire rute API
│   │
│   ├── controllers/
│   │   └── paymentController.js # 🎮 Logica endpoint-urilor
│   │
│   ├── services/
│   │   └── stripeService.js     # 🔌 Integrare Stripe
│   │
│   └── middleware/
│       └── errorHandler.js      # ⚠️ Tratare erori
│
├── .env.example                 # 🔐 Template variabile de mediu
├── .env                         # 🔐 Variabile reale (NU adaugă în Git!)
├── package.json                 # 📦 Dependențe Node
├── README.md                    # 📖 Documentație
├── SETUP.md                     # 🔧 Setup guide
└── EXAMPLES.js                  # 💡 Exemple integrare
```

---

## 🔐 Security Features

✅ **CORS Configuration** - Control over allowed origins  
✅ **Input Validation** - Validează toate datele  
✅ **Stripe Signature Verification** - Verifică autenticitate webhook  
✅ **Error Handling** - Nu expune detalii sensibile  
✅ **Environment Variables** - Nu hard-codeze secrets  

---

## 🚀 FLOW-UL COMPLET AL PLĂȚII

```
┌─────────────────────────────────────────────────┐
│ 1. USER ADAUGĂ PRODUSE ÎN COȘ                   │
│    - Frontend strânge articole                  │
│    - User apasă "Plătește"                      │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 2. FRONTEND APELEAZĂ PAYMENT API                │
│    - POST /api/payment/checkout                 │
│    - Trimite: items, successUrl, cancelUrl     │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 3. PAYMENT API PROCESEAZĂ                       │
│    - Validează datele                           │
│    - Apelează Stripe API                        │
│    - Creează checkout session                   │
│    - Returnează checkout URL                    │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 4. FRONTEND REDIRECȚIONEAZĂ LA STRIPE           │
│    - window.location.href = checkoutUrl         │
│    - User e pe pagina Stripe Checkout           │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 5. USER PLĂTEȘTE PE STRIPE                      │
│    - Introduce detalii card                     │
│    - Confirmă plata                             │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 6. STRIPE PROCESEAZĂ PLATA                      │
│    - Autorizează card                           │
│    - Procesează taxa                            │
│    - Trimite webhook cu rezultat                │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 7. PAYMENT API PRIMEȘTE WEBHOOK                 │
│    - POST /api/payment/webhook                  │
│    - Procesează eveniment                       │
│    - Log plată confirmată                       │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 8. USER E REDIRECȚIONAT LA SUCCESS PAGE         │
│    - Pagina succesuURL                          │
│    - Frontend verifică status                   │
│    - Finalizează comanda                        │
└─────────────────────────────────────────────────┘
```

---

## 🆘 Troubleshooting

### ❌ `STRIPE_SECRET_KEY nu este definit`
✅ Completează .env cu cheia ta Stripe

### ❌ `CORS Error`
✅ Adaugă origin-ul în `ALLOWED_ORIGINS` din .env

### ❌ `StripeSignatureVerificationError`
✅ Verifică că `STRIPE_WEBHOOK_SECRET` este corect în .env

### ❌ Server nu pornește
✅ Verifica că portul 3000 nu e folosit: `lsof -i :3000`

---

## 📖 Fișiere Importante

- [README.md](README.md) - Documentație principală
- [SETUP.md](SETUP.md) - Setup detaliat
- [EXAMPLES.js](EXAMPLES.js) - Exemple integrare
- [src/index.js](src/index.js) - Entry point
- [src/services/stripeService.js](src/services/stripeService.js) - Logica Stripe

---

## 🎓 Ce ai învățat?

✅ Cum funcționează Stripe Checkout  
✅ Cum să creezi o API generică și refolosibilă  
✅ Cum să integrezi în mai multe aplicații  
✅ Cum să handluiezi webhook-urile  
✅ Structura unei aplicații Node.js profesionale  

---

## 🚀 Next Steps

1. **Configurează .env** cu cheile Stripe
2. **Pornește server-ul**: `npm run dev`
3. **Testează endpoint-urile** cu CURL
4. **Integrează în frontend** - copy-paste cod din EXAMPLES.js
5. **Deploy pe production** - See SETUP.md

---

## 💬 Notes

- API este **complet independent** - nu stochează date
- Logica de business (email, DB, factură) rămâne în **aplicația ta**
- Webhook-urile fac legătura între Payment API și aplicația ta
- Perfect pentru microservices architecture

---

## 📝 License

MIT

---

**🎉 API este gata pentru utilizare!**

Pentru suport: https://stripe.com/docs  
Status: https://status.stripe.com  

**Creat cu ❤️ pentru a face plățile online simple și refolosibile.**
