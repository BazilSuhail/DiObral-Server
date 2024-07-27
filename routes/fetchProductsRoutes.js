const express = require('express');
const router = express.Router();
const { getAllProducts, getProductById } = require('../controllers/productFetchController');

// Fetch all products
router.get('/products', getAllProducts); 
// Fetch product by ID
router.get('/products/:id', getProductById);

module.exports = router;
