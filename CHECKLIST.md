# ✅ CHECKLIST - Payment API Setup & Deployment

## 📋 Pre-Setup Checklist

- [ ] Ai cont Stripe creat? (https://stripe.com)
- [ ] Ai email verificat pe Stripe?
- [ ] Esti în test mode (nu live)?

## 🔧 Setup Local - 10 minute

### Step 1: Obtain API Keys
- [ ] Du-te pe https://dashboard.stripe.com
- [ ] Settings > API Keys > Reveal Secret Key
- [ ] Copie Secret Key (sk_test_...)
- [ ] Copie Publishable Key (pk_test_...)

### Step 2: Obtain Webhook Secret
- [ ] Settings > Webhooks > Add endpoint
- [ ] Endpoint URL: `http://localhost:3000/api/payment/webhook`
- [ ] Select Events:
  - [ ] `checkout.session.completed`
  - [ ] `checkout.session.async_payment_succeeded`
  - [ ] `checkout.session.async_payment_failed`
- [ ] Copie webhook secret (whsec_...)

### Step 3: Configure .env
```bash
# In folder: /home/asu/Desktop/workspace/payment-api
cp .env.example .env
```
- [ ] Edit .env și adaugă:
  - [ ] STRIPE_SECRET_KEY = sk_test_...
  - [ ] STRIPE_PUBLISHABLE_KEY = pk_test_...
  - [ ] STRIPE_WEBHOOK_SECRET = whsec_...
  - [ ] PORT = 3000
  - [ ] NODE_ENV = development

### Step 4: Install Dependencies
```bash
cd /home/asu/Desktop/workspace/payment-api
npm install
```
- [ ] Instalare completă (0 vulnerabilities)

### Step 5: Start Server
```bash
npm run dev
```
- [ ] Server pornit pe http://localhost:3000
- [ ] Log message: "💳 PAYMENT API - STRIPE CHECKOUT SERVICE"

## 🧪 Testing Local - 10 minute

### Test 1: Health Check
```bash
curl http://localhost:3000/api/payment/health
```
- [ ] Response: `{ "success": true, "message": "Payment API este activ" }`

### Test 2: Root Endpoint
```bash
curl http://localhost:3000/
```
- [ ] Response include lista de endpoints

### Test 3: Create Checkout Session
```bash
curl -X POST http://localhost:3000/api/payment/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{
      "name": "Test Product",
      "description": "Test Desc",
      "price": 2999,
      "currency": "ron",
      "quantity": 1
    }],
    "successUrl": "http://localhost:3000",
    "cancelUrl": "http://localhost:3000",
    "clientId": "test-123"
  }'
```
- [ ] Response include `sessionId` și `checkoutUrl`
- [ ] URL-ul e valid Stripe checkout link

### Test 4: Check Payment Status
```bash
curl http://localhost:3000/api/payment/status/cs_test_YOUR_SESSION_ID
```
(Folosește sessionId din Test 3)
- [ ] Response include status al sesiunii

### Test 5: Manual Stripe Checkout
1. [ ] Copiază `checkoutUrl` din Test 3
2. [ ] Paste în browser
3. [ ] Ar trebui să vezi Stripe Checkout form
4. [ ] Introdu test card: `4242 4242 4242 4242`
5. [ ] Expiry: `12/34` (orice data viitoare)
6. [ ] CVC: `123`
7. [ ] Email: `test@example.com`
8. [ ] Apasă "Pay"
9. [ ] Ar trebui redirect la successUrl

## 📱 Frontend Integration - 15 minute

### React Integration
- [ ] Instala dependencies: `npm install axios`
- [ ] Copia code din EXAMPLES.js - React section
- [ ] Adapteaza URLs:
  - [ ] PAYMENT_API_URL = 'http://localhost:3000/api/payment'
  - [ ] successUrl = `${window.location.origin}/success`
  - [ ] cancelUrl = `${window.location.origin}/cancel`
- [ ] Testeaza checkout flow
- [ ] Verifica console pentru errori

### Vue Integration
- [ ] Copia code din EXAMPLES.js - Vue section
- [ ] Adapteaza URLs către payment API
- [ ] Testeaza checkout flow

### Angular Integration
- [ ] Copia code din EXAMPLES.js - Angular section
- [ ] Adapteaza URLs către payment API
- [ ] Testeaza checkout flow

## 🔄 Webhook Testing (Optional - Advanced)

Stripe webhook-urile sunt deja configurate. Pentru local testing:

1. [ ] Download Stripe CLI: https://stripe.com/docs/stripe-cli
2. [ ] Authenticate: `stripe login`
3. [ ] Forward webhooks: `stripe listen --forward-to localhost:3000/api/payment/webhook`
4. [ ] Copy signing secret și adaugă în .env
5. [ ] Testeaza: `stripe trigger checkout.session.completed`

## 🚀 Production Deployment

### Before Deployment:
- [ ] Switch to LIVE keys (nu test!)
- [ ] Remove debug logging?
- [ ] Set NODE_ENV=production
- [ ] Configure ALLOWED_ORIGINS cu domain-urile tale reale

### Deployment Platforms:

#### Heroku Deployment:
```bash
heroku create payment-api-prod
heroku config:set STRIPE_SECRET_KEY=sk_live_...
heroku config:set STRIPE_WEBHOOK_SECRET=whsec_...
git push heroku main
```
- [ ] App created pe Heroku
- [ ] Environment variables setate
- [ ] Deployed successfully

#### Vercel Deployment:
- [ ] Create serverless function
- [ ] Copy src/index.js logic
- [ ] Set environment variables
- [ ] Deploy

#### AWS/GCP Deployment:
- [ ] Containerize cu Docker (optional)
- [ ] Deploy pe Cloud Run / Lambda
- [ ] Set environment variables
- [ ] Configure webhooks în Stripe

### Post Deployment:
- [ ] Update webhook URL în Stripe Dashboard
- [ ] Test health check: `curl https://your-domain.com/api/payment/health`
- [ ] Test checkout create endpoint
- [ ] Verify CORS settings
- [ ] Monitor logs

## 📊 Performance & Monitoring

- [ ] Setup logging service (PM2 logs, CloudWatch, etc)
- [ ] Monitor error rates
- [ ] Check response times
- [ ] Monitor Stripe API usage
- [ ] Setup alerts

## 🔐 Security Checklist

- [ ] .env nu e în Git (check .gitignore)
- [ ] Secret keys nu sunt hard-coded
- [ ] CORS este restrictiv (doar domenii autorizate)
- [ ] Input validation activat
- [ ] Error messages nu expun detalii sensibile
- [ ] Webhook signature verification activat
- [ ] HTTPS enabled (pe production)

## 📚 Documentation

- [ ] README.md citit complet? ✅
- [ ] SETUP.md reviewed? ✅
- [ ] GETTING_STARTED.md reviewed? ✅
- [ ] EXAMPLES.js reviewed? ✅
- [ ] Code comentarii sunt clare?

## 🎓 Learning Goals

- [ ] Inteleg cum funcționează Stripe Checkout?
- [ ] Inteleg webhook flow?
- [ ] Pot integra în orice frontend app?
- [ ] Pot deployi pe production?
- [ ] Stiu cum să debug problemele?

## ✨ Optional Enhancements

- [ ] Add database to store orders (PostgreSQL)
- [ ] Add email notifications
- [ ] Add invoice generation
- [ ] Add refund handling
- [ ] Add subscription support
- [ ] Add multiple currency support
- [ ] Add analytics
- [ ] Add API rate limiting
- [ ] Add caching layer
- [ ] Add authentication

---

## 📞 Need Help?

- Stripe Docs: https://stripe.com/docs
- API Status: https://status.stripe.com
- Support: https://support.stripe.com

---

## ✅ Final Check

- [ ] Server pornit și activ
- [ ] Endpoints testați local
- [ ] Frontend integrat
- [ ] Plăți test reușite
- [ ] Production-ready?

**Gata? 🎉 Payment API este funcțional!**
