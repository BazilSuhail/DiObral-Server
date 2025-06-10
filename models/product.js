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
    type: String,
    required: true,
    trim: true,
  },
  subcategory: {
    type: String,
    required: true,
    trim: true,
  },
  rating: {
    type: Number,
    required: true,
    default: 0,
  },
  size: [String], // Array of sizes
  stock: {
    type: Number,
    required: true,
  },
  reviews: {
    type: Number,
    required: true,
    default: 0, 
  },
  price: {
    type: Number,
    required: true,
  },
  sale: {
    type: Number,
    default: 0, // Percentage off
  },
  image: {
    type: String,
    required: true,
  },
  otherImages: [
    {
      type: String, 
    },
  ],
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
});

const Product = mongoose.model('Product', ProductSchema);

module.exports = Product;
