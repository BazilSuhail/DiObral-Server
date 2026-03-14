const crypto = require('crypto');
const CartState = require('../models/CartState');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Profile = require('../models/Profile');
const Coupon = require('../models/Coupon');

const applyCoupon = async (couponCode, storeId, subtotal) => {
  if (!couponCode) return { discount: 0, coupon: null };

  const coupon = await Coupon.findOne({
    store: storeId,
    code: couponCode.toUpperCase(),
    isActive: true,
  });

  if (!coupon) return { discount: 0, coupon: null };
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return { discount: 0, coupon: null };
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return { discount: 0, coupon: null };
  if (subtotal < coupon.minOrderAmount) return { discount: 0, coupon: null };

  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = subtotal * (coupon.value / 100);
    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  } else {
    discount = Math.min(coupon.value, subtotal);
  }

  discount = Math.round(discount * 100) / 100;
  coupon.usedCount += 1;
  await coupon.save();

  return { discount, coupon: coupon._id };
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

    const cart = await CartState.findOne({ userId: req.user.id }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    for (const item of cart.items) {
      if (!item.product || !item.product.isActive) {
        return res.status(400).json({
          error: `"${item.product?.name || 'Product'}" is no longer available`,
        });
      }
      if (item.quantity > item.product.stock) {
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
    let totalDiscount = 0;

    for (const [storeId, items] of Object.entries(storeGroups)) {
      const orderItems = items.map((item) => {
        const originalPrice = item.product.price;
        const salePrice = item.product.sale > 0
          ? originalPrice - (originalPrice * item.product.sale) / 100
          : originalPrice;

        return {
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

      // Try applying coupon to this store's order
      const { discount, coupon } = await applyCoupon(couponCode, storeId, subtotal);
      totalDiscount += discount;

      const order = new Order({
        customer: req.user.id,
        store: storeId,
        groupOrderId,
        items: orderItems,
        shippingAddress,
        contactPhone,
        subtotal,
        discount,
        total: Math.max(0, subtotal - discount),
        status: 'pending',
        notes: notes || '',
        coupon: coupon || undefined,
      });

      await order.save();
      createdOrders.push(order);

      for (const item of items) {
        await Product.findByIdAndUpdate(item.product._id, {
          $inc: { stock: -item.quantity },
        });
      }
    }

    cart.items = [];
    await cart.save();

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
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
