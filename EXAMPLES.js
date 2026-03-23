/**
 * EXEMPLU INTEGRARE CLIENT SIDE
 * =============================
 * Fișier cu exemple de cum să integri Payment API într-o aplicație frontend
 * IMPORTANT: Acest fișier este pentru referință, nu se execută pe server
 */

// ==================== EXEMPLU 1: FORM HTML + JAVASCRIPT ====================

/*
<!DOCTYPE html>
<html>
<head>
    <title>Platforma de Cumpărături</title>
    <script src="https://js.stripe.com/v3/"></script>
</head>
<body>
    <h1>Coș de cumpărături</h1>
    
    <div id="cart">
        <div class="product">
            <h3>Laptop</h3>
            <p>Preț: 1999.99 RON</p>
            <input type="number" min="1" value="1" id="laptop-qty" />
            <button onclick="addToCart('laptop', 'Laptop', 'Laptop 16GB RAM', 199900, 1)">
                Adaugă în coș
            </button>
        </div>
    </div>

    <button id="checkout-btn" onclick="handleCheckout()">Plătește acum</button>

    <script>
        const PAYMENT_API_URL = 'http://localhost:3000/api/payment';
        let cartItems = [];

        function addToCart(id, name, description, price, quantity) {
            cartItems.push({
                name: name,
                description: description,
                price: price, // în bani (1999.99 RON = 199999 bani)
                currency: 'ron',
                quantity: quantity
            });
            alert('Produs adăugat în coș!');
        }

        async function handleCheckout() {
            try {
                // 1. Pregătă datele pentru checkout
                const checkoutData = {
                    items: cartItems,
                    successUrl: `${window.location.origin}/success`,
                    cancelUrl: `${window.location.origin}/cancel`,
                    clientId: 'user-' + Date.now() // ID unic pentru user
                };

                // 2. Trimite request la Payment API
                const response = await fetch(`${PAYMENT_API_URL}/checkout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(checkoutData)
                });

                const data = await response.json();

                if (!data.success) {
                    alert('Eroare: ' + data.error);
                    return;
                }

                // 3. Redirecționează user la Stripe Checkout
                window.location.href = data.checkoutUrl;

            } catch (error) {
                console.error('Eroare:', error);
                alert('A apărut o eroare: ' + error.message);
            }
        }

        // 4. După ce user se întoarce de la plată
        async function checkPaymentStatus() {
            // Obții sessionId din URL (Stripe o adaugă)
            const params = new URLSearchParams(window.location.search);
            const sessionId = params.get('session_id');

            if (!sessionId) return;

            const response = await fetch(`${PAYMENT_API_URL}/status/${sessionId}`);
            const data = await response.json();

            if (data.session.status === 'paid') {
                console.log('Plată reușită!');
                // Aici poți marca comanda ca plătită în baza de date
            }
        }

        // Verific status la încărcarea paginii
        checkPaymentStatus();
    </script>
</body>
</html>
*/

// ==================== EXEMPLU 2: REACT COMPONENT ====================

/*
import React, { useState } from 'react';
import axios from 'axios';

const PaymentCheckout = () => {
  const [cartItems, setCartItems] = useState([
    {
      name: 'Laptop Pro',
      description: 'MacBook Pro 16"',
      price: 199900, // în bani
      currency: 'ron',
      quantity: 1
    }
  ]);
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        'http://localhost:3000/api/payment/checkout',
        {
          items: cartItems,
          successUrl: `${window.location.origin}/success`,
          cancelUrl: `${window.location.origin}/cancel`,
          clientId: `user-${Date.now()}`
        }
      );

      // Redirecționează la Stripe Checkout
      window.location.href = response.data.checkoutUrl;
    } catch (error) {
      console.error('Eroare checkout:', error);
      alert('Eroare la creare checkout: ' + error.response?.data?.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout-container">
      <h2>Coș de cumpărături</h2>
      <div className="cart-items">
        {cartItems.map((item, idx) => (
          <div key={idx} className="cart-item">
            <p>{item.name} - {item.price / 100} RON</p>
            <p>Cantitate: {item.quantity}</p>
          </div>
        ))}
      </div>
      <button 
        onClick={handleCheckout} 
        disabled={loading}
        className="checkout-btn"
      >
        {loading ? 'Se procesează...' : 'Plătește cu Stripe'}
      </button>
    </div>
  );
};

export default PaymentCheckout;
*/


// ==================== EXEMPLU 4: ABONAMENT LUNAR ====================

/*
async function createMonthlySubscription() {
  const response = await fetch('http://localhost:3000/api/payment/checkout/subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [
        {
          name: 'Plan Premium',
          description: 'Acces complet lunar',
          price: 9900,
          currency: 'ron'
        }
      ],
      successUrl: 'https://app.example.com/subscription/success',
      cancelUrl: 'https://app.example.com/subscription/cancel',
      clientId: 'user-123',
      customerEmail: 'client@example.com'
    })
  });

  const data = await response.json();
  window.location.href = data.checkoutUrl;
}
*/

// ==================== EXEMPLU 3: BACKEND INTEGRATION (Node.js) ====================

/*
const express = require('express');
const axios = require('axios');

const app = express();
const PAYMENT_API = 'http://localhost:3000/api/payment';

// Rută care creează checkout
app.post('/api/create-order', async (req, res) => {
  try {
    const { products, userId } = req.body;

    // Transformă produsele din DB format la Payment API format
    const items = products.map(p => ({
      name: p.title,
      description: p.description,
      price: Math.round(p.price * 100), // Convertește din RON în bani
      currency: 'ron',
      quantity: p.quantity
    }));

    // Apelează Payment API
    const checkoutResponse = await axios.post(
      `${PAYMENT_API}/checkout`,
      {
        items: items,
        successUrl: `${process.env.FRONTEND_URL}/order-success`,
        cancelUrl: `${process.env.FRONTEND_URL}/order-canceled`,
        clientId: userId
      }
    );

    // Trimite checkout URL-ul înapoi clientului
    res.json({
      success: true,
      checkoutUrl: checkoutResponse.data.checkoutUrl
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Rută pentru a verifica status plății
app.get('/api/check-payment/:sessionId', async (req, res) => {
  try {
    const response = await axios.get(
      `${PAYMENT_API}/status/${req.params.sessionId}`
    );

    // Dacă plata e reușită, actualizează DB
    if (response.data.session.status === 'paid') {
      // TODO: Actualizează DB cu status = paid
      // TODO: Trimite email de confirmare
      // TODO: Generează factura
    }

    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(5000, () => console.log('App server on port 5000'));
*/

// ==================== EXEMPLU 4: WEBHOOK HANDLING ====================

/*
SETUP WEBHOOK ÎN STRIPE DASHBOARD:

1. Du-te pe https://dashboard.stripe.com
2. Settings > Webhooks
3. Click "Add endpoint"
4. Endpoint URL: https://your-domain.com/api/payment/webhook
5. Event types să selectezi:
   - checkout.session.completed
   - checkout.session.async_payment_succeeded
   - checkout.session.async_payment_failed
   - charge.succeeded
   - charge.failed

6. Copy webhook secret și pune în .env STRIPE_WEBHOOK_SECRET

ÎN APLICAȚIA TA, poți ascolta webhook-urile:

const express = require('express');
const axios = require('axios');

app.post('/webhook/payment-confirmed', (req, res) => {
  const { session } = req.body;
  
  // Sesiunea a fost confirmare - plata reușită
  console.log('Plată confirmată pentru:', session.id);
  
  // Actualizează baza de date cu status = paid
  // Trimite email de confirmare
  // Activează accesul la produs
  
  res.json({ received: true });
});

// Sau poți chiar să asculți direct webhook-urile Stripe
// și să faci operații la nivel de backend
*/

// ==================== EXEMPLU 5: CURL REQUESTS (PENTRU TESTING) ====================

/*
1. CREATE CHECKOUT SESSION:
curl -X POST http://localhost:3000/api/payment/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "name": "Laptop",
        "description": "MacBook Pro 16",
        "price": 199900,
        "currency": "ron",
        "quantity": 1
      }
    ],
    "successUrl": "https://myapp.com/success",
    "cancelUrl": "https://myapp.com/cancel",
    "clientId": "user123"
  }'

2. CHECK PAYMENT STATUS:
curl http://localhost:3000/api/payment/status/cs_test_a1b2c3d4e5f6

3. HEALTH CHECK:
curl http://localhost:3000/api/payment/health

4. ROOT ENDPOINT:
curl http://localhost:3000/
*/

// ==================== FLOW-UL COMPLET ====================

/*
┌─────────────────────────────────────────────────────────────────┐
│                    FLOW-UL PLĂȚII COMPLETE                      │
└─────────────────────────────────────────────────────────────────┘

1. USER ADAUGĂ PRODUSE ÎN COȘ
   │
   ├─ JavaScript client obține lista de produse
   └─ User apasă "Plătește"

2. CLIENTUL TRIMITE DATELE LA PAYMENT API
   │
   ├─ POST /api/payment/checkout
   └─ Body: { items: [...], successUrl, cancelUrl }

3. PAYMENT API PROCESEAZĂ CEREREA
   │
   ├─ Validează datele
   ├─ Apelează Stripe API
   ├─ Primește checkout session ID
   └─ Returnează checkout URL

4. USER E REDIRECȚIONAT LA STRIPE CHECKOUT
   │
   ├─ Pagina Stripe le cere datele de card
   ├─ User introduce card details și apasă "Pay"
   └─ Stripe procesează plata

5. DUPĂ PLATĂ (REUȘITĂ SAU EȘUATĂ)
   │
   ├─ User e redirecționat la successUrl sau cancelUrl
   └─ Frontend-ul tău verifică status-ul cu GET /status/:sessionId

6. STRIPE TRIMITE WEBHOOK
   │
   ├─ POST /api/payment/webhook
   ├─ Payment API primește eveniment "checkout.session.completed"
   ├─ Aplicația ta (daca ascultă webhooks) poate actualiza DB
   └─ Finalizezi comanda (email, factura, acces produs)

IMPORTANT:
- Payment API este GENERIC - nu stochează date
- Logica de business (email, DB, etc) rămâne în aplicația ta
- Webhook-urile fac legătura între Payment API și aplicația ta
*/

console.log('Fișier de referință - nu se execută pe server!');
