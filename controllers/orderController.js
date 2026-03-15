const Order = require('../models/Order');
const Profile = require('../models/Profile');

exports.getOrders = async (req, res) => {
  try {
    const profile = await Profile.findById(req.user.id);
    if (!profile || !profile.store) {
      return res.status(403).json({ error: 'No store found.' });
    }

    const { status } = req.query;
    const filter = { store: profile.store };
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate('customer', 'fullName email contact address')
      .lean();

    const ordersWithSavings = orders.map((order) => {
      const savings = order.items.reduce((sum, item) => {
        return sum + (item.price - item.discountedPrice) * item.quantity;
      }, 0);
      return { ...order, totalSavings: savings };
    });

    res.status(200).json(ordersWithSavings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const profile = await Profile.findById(req.user.id);
    if (!profile || !profile.store) {
      return res.status(403).json({ error: 'No store found.' });
    }

    const order = await Order.findOne({ _id: req.params.id, store: profile.store })
      .populate('customer', 'fullName email contact address');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const profile = await Profile.findById(req.user.id);
    if (!profile || !profile.store) {
      return res.status(403).json({ error: 'No store found.' });
    }

    const { status, trackingNumber } = req.body;
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const order = await Order.findOne({ _id: req.params.id, store: profile.store });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const prevStatus = order.status;

    order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    await order.save();

    // Restore stock when order is cancelled
    if (status === 'cancelled' && prevStatus !== 'cancelled') {
      const Product = require('../models/Product');
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        });
      }
    }

    res.status(200).json({ message: `Order ${status}`, order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getOrderStats = async (req, res) => {
  try {
    const profile = await Profile.findById(req.user.id);
    if (!profile || !profile.store) {
      return res.status(403).json({ error: 'No store found.' });
    }

    const stats = await Order.aggregate([
      { $match: { store: profile.store } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total: { $sum: '$total' },
        },
      },
    ]);

    const summary = {
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      totalOrders: 0,
      totalRevenue: 0,
    };

    stats.forEach((s) => {
      summary[s._id] = s.count;
      summary.totalOrders += s.count;
      summary.totalRevenue += s.total;
    });

    res.status(200).json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
