const Order = require('../models/order');

// Save order for a user
exports.saveOrder = async (req, res) => {
    const { userId } = req.params;
    const { items, orderDate, total } = req.body;

    if (!userId || !items || !orderDate || !total) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        // Check if the user already has orders
        let userOrder = await Order.findOne({ userId });

        if (!userOrder) {
            // If not, create a new order document
            userOrder = new Order({
                userId,
                orders: [
                    {
                        items,
                        orderDate,
                        total
                    }
                ]
            });
        } else {
            // If yes, push the new order into the orders array
            userOrder.orders.push({
                items,
                orderDate,
                total
            });
        }

        await userOrder.save();
        res.status(200).json(userOrder);
    } catch (error) {
        console.error('Error saving order:', error);
        res.status(500).json({ message: 'Error saving order', error: error.message });
    }
};

// Get orders for the user

// Get orders for the user
exports.getOrders = async (req, res) => {
    const { userId } = req.params;

    try {
        const userOrders = await Order.find({ userId });
        if (!userOrders.length) {
            console.log('No orders found for this user');
            return res.status(404).send({ message: 'No orders found for this user' });
        }

        //console.log('User orders:', userOrders);
        res.status(200).send(userOrders);
    } catch (error) {
        //console.error('Error fetching orders:', error);
        res.status(500).send({ message: 'Server error' });
    }
};