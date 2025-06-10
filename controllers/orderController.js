const Order = require('../models/order');
const CompletedOrder = require('../models/completedOrder');

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
// exports.getOrders = async (req, res) => {
//     const { userId } = req.params;

//     try {
//         const userOrders = await Order.find({ userId });
//         if (!userOrders.length) {
//             console.log('No orders found for this user');
//             return res.status(404).send({ message: 'No orders found for this user' });
//         }

//         //console.log('User orders:', userOrders);
//         console.log(userOrders)
//         res.status(200).send(userOrders);
//     } catch (error) {
//         //console.error('Error fetching orders:', error);
//         res.status(500).send({ message: 'Server error' });
//     }
// };
// exports.getOrders = async (req, res) => {
//     const { userId } = req.params;

//     try {
//         // Find the user's order document and populate the orders array
//         const userOrdersDoc = await Order.findOne({ userId });
        
//         if (!userOrdersDoc || !userOrdersDoc.orders.length) {
//             console.log('No orders found for this user');
//             return res.status(404).send({ message: 'No orders found for this user' });
//         }

//         // Process each order to calculate savings
//         const ordersWithSavings = userOrdersDoc.orders.map(order => {
//             // Calculate total savings for this order
//             const savings = order.items.reduce((total, item) => {
//                 return total + ((item.price - item.discountedPrice) * item.quantity);
//             }, 0);

//             return {
//                 ...order.toObject(), // Convert Mongoose document to plain object
//                 totalSavings: savings
//             };
//         });

//         // Sort orders by date (newest first)
//         ordersWithSavings.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));

//         res.status(200).send({
//             orders: ordersWithSavings
//         });
        
//     } catch (error) {
//         console.error('Error fetching orders:', error);
//         res.status(500).send({ message: 'Server error' });
//     }
// };


exports.getOrders = async (req, res) => {
    const { userId } = req.params;

    try {
        // === Active Orders ===
        const userOrdersDoc = await Order.findOne({ userId });

        let ordersWithSavings = [];
        if (userOrdersDoc && userOrdersDoc.orders.length) {
            ordersWithSavings = userOrdersDoc.orders.map(order => {
                const savings = order.items.reduce((total, item) => {
                    return total + ((item.price - item.discountedPrice) * item.quantity);
                }, 0);

                return {
                    ...order.toObject(),
                    totalSavings: savings
                };
            });

            ordersWithSavings.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
        }

        // === Completed Orders ===
        const completedOrdersDoc = await CompletedOrder.findOne({ userId });

        let completedOrdersWithSavings = [];
        if (completedOrdersDoc && completedOrdersDoc.completedOrders.length) {
            completedOrdersWithSavings = completedOrdersDoc.completedOrders.map(order => {
                const savings = order.items.reduce((total, item) => {
                    return total + ((item.price - item.discountedPrice) * item.quantity);
                }, 0);

                return {
                    ...order.toObject(),
                    totalSavings: savings
                };
            });

            completedOrdersWithSavings.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
        }

        // If both are empty
        if (ordersWithSavings.length === 0 && completedOrdersWithSavings.length === 0) {
            console.log('No orders found for this user');
            return res.status(404).send({ message: 'No orders found for this user' });
        }

        // Send both sets of orders
        res.status(200).send({
            activeOrders: ordersWithSavings,
            completedOrders: completedOrdersWithSavings
        });

    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send({ message: 'Server error' });
    }
};
