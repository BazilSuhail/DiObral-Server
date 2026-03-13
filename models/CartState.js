const mongoose = require('mongoose');

const CartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  size: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
  },
  bundleGroupId: {
    type: String,
    default: null,
  },
});

const CartStateSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    required: true,
    unique: true,
  },
  items: [CartItemSchema],
});

CartStateSchema.index({ updatedAt: 1 });

module.exports = mongoose.model('CartState', CartStateSchema);
