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
  size: [String], // Array of sizes
  stock: {
    type: Number,
    required: true,
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
    type: String, // URL or path to the main image
    required: true,
  },
  otherImages: [
    {
      type: String, // Array of URLs or paths to additional images
    },
  ],
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
});

const Product = mongoose.model('Product', ProductSchema);

module.exports = Product;
