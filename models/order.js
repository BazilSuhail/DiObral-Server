const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    discountedPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    size: { type: String, required: true }  // Add this line for size
});

const individualOrderSchema = new mongoose.Schema({
    items: [orderItemSchema],
    orderDate: { type: Date, default: Date.now },
    total: { type: Number, required: true }
});

const orderSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    orders: [individualOrderSchema]
});

module.exports = mongoose.model('Order', orderSchema);
