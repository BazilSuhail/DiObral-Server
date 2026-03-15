const Order = require('../models/Order');

exports.getOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { customer: req.user.id };
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate('store', 'storeName slug logo')
      .lean();

    // Group by groupOrderId
    const groups = {};
    for (const order of orders) {
      const key = order.groupOrderId || order._id.toString();
      if (!groups[key]) {
        groups[key] = {
          groupOrderId: key,
          createdAt: order.createdAt,
          orders: [],
          total: 0,
          status: order.status,
        };
      }
      groups[key].orders.push(order);
      groups[key].total += order.total;
      // Use most advanced non-cancelled status for the group
      if (order.status === 'cancelled') continue;
      const statusOrder = ['pending', 'processing', 'shipped', 'delivered'];
      const currentIdx = statusOrder.indexOf(groups[key].status);
      const orderIdx = statusOrder.indexOf(order.status);
      if (orderIdx > currentIdx) {
        groups[key].status = order.status;
      }
    }

    const groupedOrders = Object.values(groups).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    if (groupedOrders.length === 0) {
      return res.status(200).json({ orders: [] });
    }

    res.status(200).json({ orders: groupedOrders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.user.id })
      .populate('store', 'storeName slug logo contactEmail contactPhone')
      .lean();

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const savings = order.items.reduce(
      (sum, item) => sum + (item.price - item.discountedPrice) * item.quantity,
      0
    );

    res.status(200).json({ ...order, totalSavings: savings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.trackOrder = async (req, res) => {
  try {
    const order = await Order.findOne(
      { _id: req.params.id, customer: req.user.id },
      'status trackingNumber createdAt updatedAt items'
    ).lean();

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
