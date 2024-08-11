const express = require('express');
const router = express.Router();
const Product = require('../models/product'); // Adjust path as needed

// Route to fetch the first 8 products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().limit(8); // Fetch the first 8 products
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
