const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const CartState = require('../models/CartState');
const {
  getStripe,
  retrievePaymentIntent,
  constructWebhookEvent,
  mapStripeError,
} = require('../utils/payment');

exports.getPaymentIntent = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    const order = await Order.findOne({ _id: orderId, customer: req.user.id });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (!order.paymentIntentId) {
      return res.status(400).json({ error: 'No payment intent for this order' });
    }

    const paymentIntent = await retrievePaymentIntent(order.paymentIntentId);
    if (paymentIntent.status === 'succeeded') {
      return res.status(200).json({ clientSecret: null, status: 'succeeded', orderId });
    }

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      status: paymentIntent.status,
      orderId,
    });
  } catch (error) {
    const mapped = mapStripeError(error);
    res.status(mapped.status).json({ error: mapped.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    const order = await Order.findOne({ _id: orderId, customer: req.user.id });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!order.paymentIntentId) {
      const ok = order.paymentStatus === 'paid';
      return res.status(ok ? 200 : 400).json({
        status: ok ? 'succeeded' : order.paymentStatus,
        orderId,
      });
    }

    const paymentIntent = await retrievePaymentIntent(order.paymentIntentId);
    if (paymentIntent.status === 'succeeded') {
      await markOrderPaid(paymentIntent);
      return res.status(200).json({ status: 'succeeded', orderId });
    }

    res.status(200).json({ status: paymentIntent.status, orderId });
  } catch (error) {
    const mapped = mapStripeError(error);
    res.status(mapped.status).json({ error: mapped.message });
  }
};

const markOrderPaid = async (paymentIntent) => {
  const { orderId } = paymentIntent.metadata || {};
  if (!orderId) return;

  const order = await Order.findById(orderId);
  if (!order) return;

  const amount = paymentIntent.amount / 100;

  await Transaction.findOneAndUpdate(
    { stripePaymentIntentId: paymentIntent.id },
    {
      $set: {
        status: 'succeeded',
        paymentMethod: paymentIntent.payment_method_types?.[0] || 'card',
        amount,
        amountInCents: paymentIntent.amount,
        currency: paymentIntent.currency,
        failureReason: null,
      },
      $setOnInsert: {
        order: order._id,
        customer: order.customer,
        store: order.store,
        groupOrderId: order.groupOrderId,
      },
    },
    { upsert: true }
  );

  if (order.paymentStatus !== 'paid') {
    order.paymentStatus = 'paid';
    order.amountPaid = amount;
    order.paymentMethod = paymentIntent.payment_method_types?.[0] || 'card';
    order.paidAt = new Date();
    await order.save();
  }

  await clearCartIfGroupSettled(order);
};

const clearCartIfGroupSettled = async (order) => {
  if (!order.groupOrderId) return;
  const remaining = await Order.find({
    groupOrderId: order.groupOrderId,
    paymentStatus: 'requires_payment',
  }).select('_id');
  if (remaining.length === 0) {
    await CartState.updateOne(
      { userId: order.customer },
      { $set: { items: [] } }
    );
  }
};

const handlePaymentFailed = async (paymentIntent, reason) => {
  const { orderId } = paymentIntent.metadata || {};
  if (!orderId) return;

  const order = await Order.findById(orderId);
  if (!order) return;

  await Transaction.findOneAndUpdate(
    { stripePaymentIntentId: paymentIntent.id },
    {
      $set: { status: 'failed', failureReason: reason || 'Payment failed' },
      $setOnInsert: {
        order: order._id,
        customer: order.customer,
        store: order.store,
        groupOrderId: order.groupOrderId,
      },
    },
    { upsert: true }
  );

  if (order.paymentStatus !== 'failed' && order.status !== 'cancelled') {
    order.paymentStatus = 'failed';
    order.status = 'cancelled';
    order.notes = order.notes
      ? `${order.notes} | Payment failed: ${reason || 'Payment failed'}`
      : `Payment failed: ${reason || 'Payment failed'}`;
    await order.save();

    const Product = require('../models/Product');
    const Bundle = require('../models/Bundle');
    for (const item of order.items) {
      if (item.itemType === 'bundle') {
        await Bundle.findByIdAndUpdate(item.bundle, {
          $inc: { stock: item.quantity },
        });
      } else {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        });
      }
    }
  }
};

const handleRefunded = async (charge) => {
  const { orderId } = charge.metadata || {};
  if (!orderId) return;

  const order = await Order.findById(orderId);
  if (!order) return;

  await Transaction.findOneAndUpdate(
    { stripePaymentIntentId: charge.payment_intent },
    { $set: { status: 'refunded' } }
  );

  if (order.paymentStatus === 'paid') {
    order.paymentStatus = 'refunded';
    await order.save();
  }
};

exports.stripeWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];
  if (!signature) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event;
  try {
    event = constructWebhookEvent(req.body, signature);
  } catch (err) {
    const status = err.status === 503 ? 503 : 400;
    return res.status(status).json({
      error: err.status === 503
        ? 'Webhook secret (STRIPE_WEBHOOK_SECRET) is not configured yet.'
        : `Webhook signature verification failed: ${err.message}`,
    });
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      await markOrderPaid(event.data.object);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentFailed(
        event.data.object,
        event.data.object.last_payment_error?.message || 'Payment failed'
      );
      break;
    case 'payment_intent.canceled':
      await handlePaymentFailed(event.data.object, 'Payment intent canceled');
      break;
    case 'charge.refunded':
      await handleRefunded(event.data.object);
      break;
    default:
      break;
  }

  res.json({ received: true });
};
