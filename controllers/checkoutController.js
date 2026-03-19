const crypto = require('crypto');
const CartState = require('../models/CartState');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Bundle = require('../models/Bundle');
const Profile = require('../models/Profile');
const Coupon = require('../models/Coupon');
const Transaction = require('../models/Transaction');
const {
  createPaymentIntent,
  cancelPaymentIntent,
  mapStripeError,
} = require('../utils/payment');

const applyCoupon = async (couponCode, storeId, subtotal) => {
  if (!couponCode) {
    return { discount: 0, coupon: null, message: 'No coupon code provided', applied: false };
  }

  const coupon = await Coupon.findOne({
    store: storeId,
    code: couponCode.toUpperCase(),
    isActive: true,
  });

  if (!coupon) {
    return { discount: 0, coupon: null, message: `Coupon "${couponCode}" is invalid or inactive`, applied: false };
  }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return { discount: 0, coupon: null, message: `Coupon "${coupon.code}" has expired`, applied: false };
  }
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return { discount: 0, coupon: null, message: `Coupon "${coupon.code}" usage limit reached`, applied: false };
  }
  if (subtotal < coupon.minOrderAmount) {
    return {
      discount: 0,
      coupon: null,
      message: `Minimum order amount of $${coupon.minOrderAmount.toFixed(2)} required for "${coupon.code}"`,
      applied: false,
    };
  }

  let discount = 0;
  let originalDiscount = 0;
  let cappedAt = null;
  let message = `Coupon "${coupon.code}" applied`;

  if (coupon.type === 'percentage') {
    originalDiscount = subtotal * (coupon.value / 100);
    discount = originalDiscount;
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
      cappedAt = coupon.maxDiscount;
      message = `Coupon "${coupon.code}" applied — discount capped at $${coupon.maxDiscount.toFixed(2)}`;
    }
  } else {
    discount = Math.min(coupon.value, subtotal);
    originalDiscount = discount;
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
      cappedAt = coupon.maxDiscount;
      message = `Coupon "${coupon.code}" applied — discount capped at $${coupon.maxDiscount.toFixed(2)}`;
    }
  }

  discount = Math.round(discount * 100) / 100;

  coupon.usedCount += 1;
  await coupon.save();

  return {
    discount,
    coupon: coupon._id,
    message,
    applied: true,
    originalDiscount: Math.round(originalDiscount * 100) / 100,
    cappedAt,
  };
};

const SHIPPING_COST = 200;
const FREE_SHIPPING_THRESHOLD = 2000;

const rollbackCheckout = async (createdOrders) => {
  for (const order of createdOrders) {
    try {
      if (order.paymentIntentId) {
        await cancelPaymentIntent(order.paymentIntentId);
      }
    } catch {
      // best-effort
    }
    await Order.updateOne(
      { _id: order._id, paymentStatus: { $ne: 'failed' } },
      { $set: { status: 'cancelled', paymentStatus: 'failed' } }
    );
    await Transaction.updateMany(
      { order: order._id },
      { $set: { status: 'canceled' } }
    );
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

exports.checkout = async (req, res) => {
  try {
    const { shippingAddress, contactPhone, notes, couponCode } = req.body;

    if (!shippingAddress || !shippingAddress.city || !shippingAddress.street) {
      return res.status(400).json({ error: 'Shipping address (city + street) is required' });
    }
    if (!contactPhone) {
      return res.status(400).json({ error: 'Contact phone is required' });
    }

    const cart = await CartState.findOne({ userId: req.user.id })
      .populate('items.product')
      .populate('items.bundle');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    for (const item of cart.items) {
      if (item.itemType === 'bundle') {
        if (!item.bundle || !item.bundle.isActive) {
          return res.status(400).json({
            error: `"${item.bundleName || 'Bundle'}" is no longer available`,
          });
        }
        const now = new Date();
        if ((item.bundle.startsAt && item.bundle.startsAt > now) || (item.bundle.expiresAt && item.bundle.expiresAt < now)) {
          return res.status(400).json({
            error: `"${item.bundleName || 'Bundle'}" is not available right now`,
          });
        }
        if (item.bundle.stock > 0 && item.quantity > item.bundle.stock) {
          return res.status(400).json({
            error: `"${item.bundleName || 'Bundle'}" only has ${item.bundle.stock} in stock`,
          });
        }
        if (item.bundle.maxPerOrder && item.quantity > item.bundle.maxPerOrder) {
          return res.status(400).json({
            error: `Maximum ${item.bundle.maxPerOrder} of "${item.bundleName || 'Bundle'}" per order`,
          });
        }
      } else if (!item.product || !item.product.isActive) {
        return res.status(400).json({
          error: `"${item.product?.name || 'Product'}" is no longer available`,
        });
      } else if (item.quantity > item.product.stock) {
        return res.status(400).json({
          error: `"${item.product.name}" only has ${item.product.stock} in stock`,
        });
      }
    }

    const storeGroups = {};
    for (const item of cart.items) {
      const storeId = item.store?.toString() || item.product.store?.toString();
      if (!storeGroups[storeId]) storeGroups[storeId] = [];
      storeGroups[storeId].push(item);
    }

    const groupOrderId = crypto.randomUUID();
    const createdOrders = [];
    const clientSecrets = [];
    let totalDiscount = 0;

    const checkoutSubtotal = cart.items.reduce((sum, item) => {
      if (item.itemType === 'bundle') {
        return sum + (item.price || 0) * item.quantity;
      }
      const originalPrice = item.product.price;
      const salePrice = item.product.sale > 0
        ? originalPrice - (originalPrice * item.product.sale) / 100
        : originalPrice;
      return sum + salePrice * item.quantity;
    }, 0);
    const shippingFee = checkoutSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;

    try {
      for (const [storeId, items] of Object.entries(storeGroups)) {
        const orderItems = items.map((item) => {
          if (item.itemType === 'bundle') {
            const bundle = item.bundle;
            return {
              itemType: 'bundle',
              bundle: bundle?._id || item.bundle,
              name: item.bundleName || bundle?.name || 'Bundle',
              image: item.image || bundle?.image || '',
              price: item.price,
              discountedPrice: item.price,
              quantity: item.quantity,
              size: '',
              bundleGroupId: (bundle?._id || item.bundle)?.toString(),
              bundleName: item.bundleName || bundle?.name || null,
            };
          }

          const originalPrice = item.product.price;
          const salePrice = item.product.sale > 0
            ? originalPrice - (originalPrice * item.product.sale) / 100
            : originalPrice;

          return {
            itemType: 'product',
            product: item.product._id,
            name: item.product.name,
            image: item.product.image,
            price: originalPrice,
            discountedPrice: salePrice,
            quantity: item.quantity,
            size: item.size,
            bundleGroupId: item.bundleGroupId || null,
            bundleName: item.bundleName || null,
          };
        });

        const subtotal = orderItems.reduce((sum, i) => sum + i.discountedPrice * i.quantity, 0);

        const { discount, coupon, message, applied, originalDiscount, cappedAt } =
          await applyCoupon(couponCode, storeId, subtotal);
        totalDiscount += discount;

        const orderShipping = createdOrders.length === 0 ? shippingFee : 0;

        const order = new Order({
          customer: req.user.id,
          store: storeId,
          groupOrderId,
          items: orderItems,
          shippingAddress,
          contactPhone,
          subtotal,
          discount,
          shipping: orderShipping,
          total: Math.max(0, subtotal - discount) + orderShipping,
          status: 'pending',
          notes: notes || '',
          coupon: coupon || undefined,
          paymentStatus: 'requires_payment',
        });

        await order.save();
        createdOrders.push(order);

        if (order.total > 0) {
          const idempotencyKey = `${groupOrderId}:${storeId}:${order._id}`;
          const paymentIntent = await createPaymentIntent({
            amount: order.total,
            orderId: order._id,
            groupOrderId,
            customerId: req.user.id,
            idempotencyKey,
          });

          order.paymentIntentId = paymentIntent.id;
          await order.save();

          await Transaction.create({
            customer: req.user.id,
            store: storeId,
            order: order._id,
            groupOrderId,
            stripePaymentIntentId: paymentIntent.id,
            idempotencyKey,
            amount: order.total,
            amountInCents: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: 'requires_confirmation',
            metadata: { couponApplied: applied, discount },
          });

          clientSecrets.push({
            orderId: order._id,
            clientSecret: paymentIntent.client_secret,
          });
        } else {
          order.paymentStatus = 'paid';
          order.amountPaid = 0;
          order.paidAt = new Date();
          await order.save();

          await Transaction.create({
            customer: req.user.id,
            store: storeId,
            order: order._id,
            groupOrderId,
            amount: 0,
            amountInCents: 0,
            status: 'succeeded',
            metadata: { couponApplied: applied, discount, free: true },
          });
        }

        order.discountMessage = message;
        order.couponApplied = applied;
        order.discountOriginal = originalDiscount || 0;
        order.discountCappedAt = cappedAt || null;

        for (const item of items) {
          if (item.itemType === 'bundle') {
            await Bundle.findByIdAndUpdate(item.bundle?._id || item.bundle, {
              $inc: { stock: -item.quantity },
            });
          } else {
            await Product.findByIdAndUpdate(item.product._id, {
              $inc: { stock: -item.quantity },
            });
          }
        }
      }
    } catch (error) {
      console.error('[checkout] payment error:', error);
      await rollbackCheckout(createdOrders);
      const mapped = mapStripeError(error);
      return res.status(mapped.status).json({ error: mapped.message });
    }

    await Profile.findByIdAndUpdate(req.user.id, {
      $set: {
        'address.city': shippingAddress.city,
        'address.state': shippingAddress.state || '',
        'address.street': shippingAddress.street,
        'address.country': shippingAddress.country || '',
        contact: contactPhone,
      },
    });

    res.status(201).json({
      message: `Order placed — ${createdOrders.length} package${createdOrders.length > 1 ? 's' : ''}`,
      groupOrderId,
      orders: createdOrders,
      totalDiscount,
      payment: {
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
        clientSecrets,
      },
    });
  } catch (error) {
    console.error('[checkout] error:', error);
    res.status(500).json({ error: error.message });
  }
};
