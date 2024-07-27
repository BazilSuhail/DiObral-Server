// controllers/userController.js

const Order = require('../models/Order'); // Adjust path as necessary
const Profile = require('../models/profile'); // Adjust path as necessary

// Get all users with their orders
exports.getUsersWithOrders = async (req, res) => {
    try {
        // Fetch all orders with userId and orders array
        const orders = await Order.find({}, '_id userId orders').lean();
        //console.log('Orders:', orders); // Log raw Mongoose documents
        
        // Extract userIds from orders
        const userIds = [...new Set(orders.map(order => order.userId))];
       // console.log('User IDs:', userIds); // Log unique user IDs
        
        if (userIds.length === 0) {
            return res.json([]); // No orders, return empty array
        }

        // Fetch profiles for the userIds
        const profiles = await Profile.find({ _id: { $in: userIds } }).select('_id fullName').lean();
        //console.log('Profiles:', profiles); // Log raw Mongoose documents

        // Create a map of userId to fullName
        const userMap = {};
        profiles.forEach(profile => {
            userMap[profile._id.toString()] = profile.fullName;
        });

        // Combine orders with fullName and order count
        const usersWithOrders = orders.map(order => ({
            documentId: order._id.toString(), // Include the document ID
            userId: order.userId,
            fullName: userMap[order.userId] || 'Unknown', // Use 'Unknown' if fullName not found
            orderCount: order.orders.length
        }));
       // console.log('Users with Orders:', usersWithOrders); // Log user data with fullName and orderCount

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