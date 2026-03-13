const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  sale: {
    type: Number,
    default: 0,
  },
  stock: {
    type: Number,
    required: true,
  },
  size: [String],
  rating: {
    type: Number,
    default: 0,
  },
  reviewCount: {
    type: Number,
    default: 0,
  },
  image: {
    type: String,
    required: true,
  },
  otherImages: [String],
  tags: [String],
  isActive: {
    type: Boolean,
    default: true,
  },
  favCount: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

ProductSchema.index({ store: 1, isActive: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ tags: 1 });
ProductSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Product', ProductSchema);
