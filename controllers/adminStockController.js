const Order = require('../models/Order');
const Profile = require('../models/Profile');

// Complete an order (set status to delivered)
exports.completeOrder = async (req, res) => {
    const { orderId } = req.params;

    try {
        const order = await Order.findByIdAndUpdate(
            orderId,
            { status: 'delivered' },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.status(200).json({ message: 'Order completed successfully', order });
    } catch (error) {
        console.error('Error completing order:', error);
        res.status(500).json({ message: error.message });
    }
};

// Get all users with their orders
exports.getUsersWithOrders = async (req, res) => {
    try {
        const orders = await Order.find().populate('customer', 'fullName email contact').lean();

        const userMap = {};
        orders.forEach(order => {
            const id = order.customer?._id?.toString() || order.customer;
            if (!userMap[id]) {
                userMap[id] = {
                    userId: id,
                    fullName: order.customer?.fullName || 'Unknown',
                    email: order.customer?.email || 'N/A',
                    contact: order.customer?.contact || 'N/A',
                    orderCount: 0,
                };
            }
            userMap[id].orderCount++;
        });

        res.json(Object.values(userMap));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order.findById(id).lean();

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get order details (same as getById in new flat schema)
exports.getOrderDetails = async (req, res) => {
    const { orderId } = req.params;

    try {
        const order = await Order.findById(orderId).lean();

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json(order);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};