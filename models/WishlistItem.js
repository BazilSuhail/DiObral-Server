const mongoose = require('mongoose');

const WishlistItemSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    required: true,
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

WishlistItemSchema.index({ customer: 1, product: 1 }, { unique: true });
WishlistItemSchema.index({ customer: 1, addedAt: -1 });

module.exports = mongoose.model('WishlistItem', WishlistItemSchema);
