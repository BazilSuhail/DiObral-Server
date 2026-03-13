const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  title: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  isVerifiedPurchase: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

ReviewSchema.index({ product: 1, createdAt: -1 });
ReviewSchema.index({ customer: 1 });
ReviewSchema.index({ product: 1, rating: -1 });

module.exports = mongoose.model('Review', ReviewSchema);
