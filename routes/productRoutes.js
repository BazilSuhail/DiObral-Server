const express = require('express');
const router = express.Router();
const { addProduct, getAllProducts, getProductsByCategory, getProductById, updateProduct, deleteProduct, uploadImages } = require('../controllers/productController');

// Middleware for image uploads
router.post('/add', uploadImages, addProduct);

// Get all products
router.get('/', getAllProducts);

// Get products by category
router.get('/category', getProductsByCategory);

// Get a product by ID
router.get('/:id', getProductById);

// Update a product by ID
router.put('/:id', uploadImages, updateProduct);

// Delete a product by ID
router.delete('/:id', deleteProduct);

module.exports = router;
