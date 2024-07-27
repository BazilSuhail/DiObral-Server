const mongoose = require('mongoose');

// Define schema for individual items in a completed order
const completedOrderItemSchema = new mongoose.Schema({
    itemName: { type: String, required: true },
    itemPrice: { type: Number, required: true },
    itemDiscountedPrice: { type: Number, required: true },
    itemQuantity: { type: Number, required: true }
});

// Define schema for an individual completed order
const completedOrderDetailsSchema = new mongoose.Schema({
    itemsList: [completedOrderItemSchema],
    orderPlacedDate: { type: Date, default: Date.now },
    orderTotalAmount: { type: Number, required: true }
});

// Define schema for completed orders, associated with a user
const completedOrderSchema = new mongoose.Schema({
    userIdentifier: { type: String, required: true },
    completedOrders: [completedOrderDetailsSchema],
    completionDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CompletedOrder', completedOrderSchema);
