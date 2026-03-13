const crypto = require('crypto');
const CartState = require('../models/CartState');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Profile = require('../models/Profile');

exports.checkout = async (req, res) => {
  try {
    const { shippingAddress, contactPhone, notes } = req.body;

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

    // Validate all products still exist and are in stock
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

    // Group items by store
    const storeGroups = {};
    for (const item of cart.items) {
      const storeId = item.store?.toString() || item.product.store?.toString();
      if (!storeGroups[storeId]) {
        storeGroups[storeId] = [];
      }
      storeGroups[storeId].push(item);
    }

    const groupOrderId = crypto.randomUUID();
    const createdOrders = [];

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

      const order = new Order({
        customer: req.user.id,
        store: storeId,
        groupOrderId,
        items: orderItems,
        shippingAddress,
        contactPhone,
        subtotal,
        discount: 0,
        total: subtotal,
        status: 'pending',
        notes: notes || '',
      });

      await order.save();
      createdOrders.push(order);

      // Decrement stock for each item
      for (const item of items) {
        await Product.findByIdAndUpdate(item.product._id, {
          $inc: { stock: -item.quantity },
        });
      }
    }

    // Clear cart
    cart.items = [];
    await cart.save();

    // Save shipping address to profile if not set
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
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
