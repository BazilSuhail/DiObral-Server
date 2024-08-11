const CartState = require('../models/cart');

// Save cart state for a user
exports.saveCart = async (req, res) => {
    const { userId, items } = req.body;

    try {
        // Ensure items include the size field
        const cart = await CartState.findOneAndUpdate(
            { userId },
            { items },
            { new: true, upsert: true }
        );
        res.status(200).json(cart);
    } catch (error) {
        res.status(500).json({ message: 'Error saving cart state', error });
    }
};

// Get cart state for a user
exports.getCart = async (req, res) => {
    const { userId } = req.params;

    try {
        const cart = await CartState.findOne({ userId });
        if (!cart) return res.status(404).json({ message: 'Cart not found' });
        res.status(200).json(cart);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching cart state', error });
    }
};
