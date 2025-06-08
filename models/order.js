const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    image: { type: String, required: true },
    price: { type: Number, required: true },
    discountedPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    size: { type: String, required: true }
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

//module.exports = mongoose.model('Order', orderSchema);
const Order = mongoose.model('Order', orderSchema);

module.exports = Order;