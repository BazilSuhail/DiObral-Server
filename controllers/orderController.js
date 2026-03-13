const Order = require('../models/Order');

// Save order for a user
exports.saveOrder = async (req, res) => {
    const { userId } = req.params;
    const { items, orderDate, total, subtotal, discount, shippingAddress, contactPhone, store, groupOrderId } = req.body;

    if (!userId || !items || !total) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const order = new Order({
            customer: userId,
            store: store || null,
            groupOrderId: groupOrderId || null,
            items,
            shippingAddress,
            contactPhone,
            subtotal: subtotal || total,
            discount: discount || 0,
            total,
            status: 'pending',
        });

        await order.save();
        res.status(200).json(order);
    } catch (error) {
        console.error('Error saving order:', error);
        res.status(500).json({ message: 'Error saving order', error: error.message });
    }
};

// Get orders for the user
exports.getOrders = async (req, res) => {
    const { userId } = req.params;

    try {
        const orders = await Order.find({ customer: userId }).sort({ createdAt: -1 }).lean();

        const ordersWithSavings = orders.map(order => {
            const savings = order.items.reduce((total, item) => {
                return total + ((item.price - item.discountedPrice) * item.quantity);
            }, 0);

            return { ...order, totalSavings: savings };
        });

        const activeOrders = ordersWithSavings.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
        const completedOrders = ordersWithSavings.filter(o => o.status === 'delivered' || o.status === 'cancelled');

        if (ordersWithSavings.length === 0) {
            return res.status(404).send({ message: 'No orders found for this user' });
        }

        res.status(200).send({ activeOrders, completedOrders });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send({ message: 'Server error' });
    }
};
