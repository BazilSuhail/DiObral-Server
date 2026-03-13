const mongoose = require('mongoose');

const BundleItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1,
  },
});

const BundleSchema = new mongoose.Schema({
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  image: {
    type: String,
    default: '',
  },
  items: {
    type: [BundleItemSchema],
    required: true,
    validate: {
      validator: (v) => v.length > 0,
      message: 'Bundle must have at least one item',
    },
  },
  price: {
    type: Number,
    required: true,
  },
  originalTotal: {
    type: Number,
    required: true,
  },
  stock: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  startsAt: {
    type: Date,
    default: null,
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  maxPerOrder: {
    type: Number,
    default: null,
  },
  tags: [String],
}, { timestamps: true });

BundleSchema.index({ store: 1, isActive: 1 });
BundleSchema.index({ tags: 1 });
BundleSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('Bundle', BundleSchema);
