// routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const { saveCart, getCart } = require('../controllers/cartController');

// Save cart state
router.post('/cart/save', saveCart);

// Get cart state
router.get('/cart/:userId', getCart);

module.exports = router;
