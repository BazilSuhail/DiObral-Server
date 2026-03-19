const mongoose = require('mongoose');

const CartItemSchema = new mongoose.Schema({
  itemType: {
    type: String,
    enum: ['product', 'bundle'],
    default: 'product',
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null,
  },
  bundle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bundle',
    default: null,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  size: {
    type: String,
    default: '',
  },
  price: {
    type: Number,
    required: true,
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
  },
  bundleName: {
    type: String,
    default: null,
  },
  image: {
    type: String,
    default: '',
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
