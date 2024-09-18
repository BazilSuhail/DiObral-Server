// models/ProductReview.js
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    date: { type: Date, default: Date.now },
    rating: { type: Number, min: 1, max: 5 },
    description: String
});

const productReviewSchema = new mongoose.Schema({
    productId: { type: String, required: true, unique: true },
    reviews: [reviewSchema]
});

module.exports = mongoose.model('ProductReview', productReviewSchema);
