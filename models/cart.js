// models/cartModel.js
const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    items: [
        {
            id: { type: String, required: true },
            quantity: { type: Number, required: true },
            price: { type: Number, required: true },
        },
    ],
});

module.exports = mongoose.model('CartState', cartSchema);
