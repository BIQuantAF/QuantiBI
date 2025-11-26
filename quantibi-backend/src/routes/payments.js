const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const User = require('../models/User');

let stripe;
try {
  const Stripe = require('stripe');
  stripe = Stripe(process.env.STRIPE_SECRET_KEY);
} catch (err) {
  console.warn('Stripe module not available or STRIPE_SECRET_KEY missing. Payment endpoints will operate in mock mode.');
}

// Log Stripe initialization status for debugging
try {
  console.log('Payments route loaded. Stripe module present:', !!stripe, 'STRIPE_SECRET_KEY set:', !!process.env.STRIPE_SECRET_KEY);
} catch (e) {
  // ignore logging errors
}

/**
 * Create a Stripe Checkout Session for subscription
 * Protected: requires authentication so we can attach user.uid to session metadata
 */
router.post('/create-checkout-session', authenticateUser, async (req, res) => {
  try {
    let { priceId, successUrl, cancelUrl } = req.body;

    // Allow backend to provide a default Price ID (set STRIPE_PRICE_ID in .env)
    const DEFAULT_PRICE_ID = process.env.STRIPE_PRICE_ID || process.env.DEFAULT_PRICE_ID || null;
    if (!priceId) {
      priceId = DEFAULT_PRICE_ID;
    }

    if (!priceId) {
      return res.status(400).json({ message: 'priceId is required (set REACT_APP_STRIPE_PRICE_ID on frontend or STRIPE_PRICE_ID on backend)' });
    }

    if (!stripe) {
      // Mock behavior for local testing
      const mockUrl = process.env.UPGRADE_URL || 'https://example.com/upgrade-mock';
      console.log('Stripe not configured; returning mock upgrade URL', mockUrl);
      return res.json({ url: mockUrl });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { uid: req.user.uid },
      success_url: successUrl || (process.env.FRONTEND_URL || 'http://localhost:3000') + '/?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancelUrl || (process.env.FRONTEND_URL || 'http://localhost:3000') + '/',
    });

    console.log('Created Stripe checkout session:', session.id, 'for user', req.user.uid);
    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ message: 'Failed to create checkout session', error: error.message });
  }
});

/**
 * Webhook handler for Stripe events.
 * This function is exported so the route can be mounted with `express.raw`
 * before the global JSON body parser, which is required for signature verification.
 */
async function stripeWebhookHandler(req, res) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    console.warn('Stripe webhook received but Stripe is not configured. Ignoring.');
    return res.status(200).send('ok');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle relevant events
  switch (event.type) {
    case 'checkout.session.completed':
      (async () => {
        try {
          const session = event.data.object;
          const uid = session.metadata?.uid;
          const subscriptionId = session.subscription;
          if (uid) {
            await User.findOneAndUpdate({ uid }, { plan: 'pro', subscriptionId }, { new: true });
            console.log('Upgraded user to pro via webhook:', uid);
          } else {
            console.warn('Webhook checkout.session.completed missing uid in metadata');
          }
        } catch (err) {
          console.error('Error handling checkout.session.completed:', err);
        }
      })();
      break;
    case 'invoice.payment_failed':
      // Optionally handle failed payments
      break;
    case 'customer.subscription.deleted':
      (async () => {
        try {
          const subscription = event.data.object;
          const subscriptionId = subscription.id;
          // Downgrade users with this subscriptionId back to free
          await User.findOneAndUpdate({ subscriptionId }, { plan: 'free', subscriptionId: null }, { new: true });
          console.log('Subscription canceled - downgraded user with subscriptionId:', subscriptionId);
        } catch (err) {
          console.error('Error handling subscription canceled webhook:', err);
        }
      })();
      break;
    default:
      console.log(`Unhandled Stripe event type: ${event.type}`);
  }

  res.json({ received: true });
}

// Attach the handler to the router so it gets exported along with the router
router.webhookHandler = stripeWebhookHandler;

module.exports = router;
