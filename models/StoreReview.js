const mongoose = require('mongoose');

const StoreReviewSchema = new mongoose.Schema({
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
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
  comment: {
    type: String,
    default: '',
  },
}, { timestamps: true });

StoreReviewSchema.index({ store: 1, createdAt: -1 });
StoreReviewSchema.index({ customer: 1 });

module.exports = mongoose.model('StoreReview', StoreReviewSchema);
