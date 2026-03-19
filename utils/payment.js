const Stripe = require('stripe');

let stripe = null;

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    const err = new Error('Payment service is not configured.');
    err.status = 503;
    throw err;
  }
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
};

const getCurrency = () => process.env.STRIPE_CURRENCY || 'pkr';

const toCents = (amount) => Math.round(amount * 100);

const mapStripeError = (error) => {
  if (!error || error.type === 'StripeAPIError' || error.type === 'StripeAPIConnectionError') {
    return { status: 500, message: 'Payment service is temporarily unavailable. Please try again.' };
  }
  switch (error.type) {
    case 'StripeCardError':
      return { status: 400, message: error.message || 'Your card was declined.' };
    case 'StripeInvalidRequestError':
      return { status: 400, message: error.message || 'Invalid payment request.' };
    case 'StripeRateLimitError':
      return { status: 429, message: 'Too many payment attempts. Please wait and try again.' };
    case 'StripeAuthenticationError':
      return { status: 500, message: 'Payment service is not configured correctly. Check STRIPE_SECRET_KEY.' };
    default:
      return { status: 400, message: error.message || 'Payment failed.' };
  }
};

const createPaymentIntent = async ({ amount, orderId, groupOrderId, customerId, idempotencyKey }) => {
  const s = getStripe();
  return s.paymentIntents.create(
    {
      amount: toCents(amount),
      currency: getCurrency(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        orderId: orderId.toString(),
        groupOrderId,
        customerId: customerId.toString(),
      },
    },
    { idempotencyKey }
  );
};

const retrievePaymentIntent = async (paymentIntentId) => {
  return getStripe().paymentIntents.retrieve(paymentIntentId);
};

const cancelPaymentIntent = async (paymentIntentId) => {
  const s = getStripe();
  try {
    const pi = await s.paymentIntents.retrieve(paymentIntentId);
    if (pi.status !== 'succeeded' && pi.status !== 'canceled') {
      await s.paymentIntents.cancel(paymentIntentId);
    }
  } catch {
    // best-effort cleanup
  }
};

const constructWebhookEvent = (rawBody, signature) => {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    const err = new Error('STRIPE_WEBHOOK_SECRET is not configured.');
    err.status = 503;
    throw err;
  }
  const s = getStripe();
  return s.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
};

module.exports = {
  getStripe,
  getCurrency,
  toCents,
  mapStripeError,
  createPaymentIntent,
  retrievePaymentIntent,
  cancelPaymentIntent,
  constructWebhookEvent,
};
