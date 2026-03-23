/**
 * STRIPE SERVICE
 * ==============
 * Serviciu care conține logica de business pentru operațiile Stripe
 * Separă logica de routing (din controller) de interacțiunea cu API-ul Stripe
 */

const stripe = require('../config/stripe');

function buildLineItems(items, billingType) {
  return items.map(item => {
    const priceData = {
      currency: item.currency.toLowerCase(),
      product_data: {
        name: item.name,
        description: item.description || 'Produs',
      },
      unit_amount: item.price,
    };

    if (billingType === 'monthly') {
      priceData.recurring = {
        interval: 'month',
      };
    }

    return {
      price_data: priceData,
      quantity: billingType === 'monthly' ? 1 : (item.quantity || 1),
    };
  });
}

/**
 * Creează o sesiune de checkout Stripe
 * 
 * @param {Object} payload - configurarea checkout-ului
 * @returns {Promise} Promisiune cu datele sesiunii Stripe
 */
async function createCheckoutSession({
  items,
  successUrl,
  cancelUrl,
  clientId = null,
  billingType = 'one_time',
  customerEmail = null,
}) {
  try {
    const lineItems = buildLineItems(items, billingType);
    const isSubscription = billingType === 'monthly';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: isSubscription ? 'subscription' : 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail || undefined,
      metadata: {
        clientId: clientId || 'unknown',
        billingType,
        createdAt: new Date().toISOString(),
      },
      subscription_data: isSubscription
        ? {
            metadata: {
              clientId: clientId || 'unknown',
              billingType,
            },
          }
        : undefined,
    });

    return session;
  } catch (error) {
    console.error('Eroare la crearea sesiei de checkout:', error);
    throw error;
  }
}

async function handleWebhook(rawBody, signature) {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const billingType = session.metadata?.billingType || 'one_time';
        console.log(
          billingType === 'monthly'
            ? 'Abonament activat - Sesiune ID:'
            : 'Plată confirmată - Sesiune ID:',
          session.id
        );
        break;
      }

      case 'customer.subscription.created':
        console.log('Subscription creat:', event.data.object.id);
        break;

      case 'customer.subscription.updated':
        console.log('Subscription actualizat:', event.data.object.id);
        break;

      case 'customer.subscription.deleted':
        console.log('Subscription anulat:', event.data.object.id);
        break;

      case 'checkout.session.async_payment_succeeded':
        console.log('Plată asincronă reușită');
        break;

      case 'checkout.session.async_payment_failed':
        console.log('Plată asincronă eșuată');
        break;

      case 'invoice.paid':
        console.log('Factură plătită:', event.data.object.id);
        break;

      case 'invoice.payment_failed':
        console.log('Plata facturii a eșuat:', event.data.object.id);
        break;

      case 'charge.failed':
        console.log('Taxa eșuată:', event.data.object.id);
        break;

      default:
        console.log('Eveniment neașteptat:', event.type);
    }

    return event;
  } catch (error) {
    console.error('Eroare la prelucrarea webhook:', error);
    throw error;
  }
}

async function getSessionStatus(sessionId) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'line_items', 'subscription'],
    });
    return session;
  } catch (error) {
    console.error('Eroare la obținerea statusului sesiei:', error);
    throw error;
  }
}

async function getPaymentIntentDetails(paymentIntentId) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('Eroare la obținerea detaliilor payment intent:', error);
    throw error;
  }
}

module.exports = {
  createCheckoutSession,
  handleWebhook,
  getSessionStatus,
  getPaymentIntentDetails,
};
