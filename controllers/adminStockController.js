// controllers/userController.js

const Order = require('../models/Order'); // Adjust path as necessary
const Profile = require('../models/profile'); // Adjust path as necessary
 
const CompletedOrder = require('../models/completedOrder'); // Path to your completed order model

// Complete an order
exports.completeOrder = async (req, res) => {
    const { userId, orderId } = req.params;

    try {
        // Find the order
        const order = await Order.findOne({ userId });
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Find the order to move
        const orderIndex = order.orders.findIndex(o => o._id.toString() === orderId);
        if (orderIndex === -1) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Move the order to completedOrders
        const [orderToComplete] = order.orders.splice(orderIndex, 1);
        let completedOrder = await CompletedOrder.findOne({ userId });

        if (!completedOrder) {
            // If no completed order document exists, create one
            completedOrder = new CompletedOrder({
                userId,
                completedOrders: [orderToComplete]
            });
        } else {
            // If exists, update it
            completedOrder.completedOrders.push(orderToComplete);
        }

        // Save both documents
        await completedOrder.save();
        await order.save();

        res.status(200).json({ message: 'Order completed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
/*

module.exports = {
    completeOrder
};

*/

// Get all users with their orders
exports.getUsersWithOrders = async (req, res) => {
    try {
        const orders = await Order.find({}, '_id userId orders').lean();
        const userIds = [...new Set(orders.map(order => order.userId))];
         
        if (userIds.length === 0) {
            return res.json([]);
        }
 
        const profiles = await Profile.find({ _id: { $in: userIds } }).select('_id fullName email contact').lean();
        const userMap = {};
        profiles.forEach(profile => {
            userMap[profile._id.toString()] = profile;
        });
 
        const usersWithOrders = orders.map(order => {
            const profile = userMap[order.userId];
            return {
                documentId: order._id.toString(),
                userId: order.userId,
                fullName: profile ? profile.fullName : 'Unknown',
                email: profile ? profile.email : 'N/A',
                contact: profile ? profile.contact : 'N/A',
                orderCount: order.orders.length
            };
        });

        res.json(usersWithOrders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// Get orders by document ID
exports.getOrderById = async (req, res) => {
    try {
        const { id } = req.params; // Get document ID from URL params
        const order = await Order.findById(id).lean();
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getOrderDetails = async (req, res) => {
    const { orderId } = req.params;

    try {
        const order = await Order.findOne({ 'orders._id': mongoose.Types.ObjectId(orderId) });
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Find the specific order item within the document
        const orderItem = order.orders.find(o => o._id.toString() === orderId);

        if (!orderItem) {
            return res.status(404).json({ message: 'Order item not found' });
        }

        res.json(orderItem);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};