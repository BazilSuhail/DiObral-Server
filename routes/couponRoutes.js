const express = require('express');
const router = express.Router();
const { createCoupon, getCoupons, updateCoupon, deleteCoupon, validateCoupon } = require('../controllers/couponController');
const auth = require('../middleware/authMiddleware');

// Public — validate a coupon code before checkout
router.post('/validate', validateCoupon);

// Retailer CRUD
router.post('/', auth, createCoupon);
router.get('/', auth, getCoupons);
router.put('/:id', auth, updateCoupon);
router.delete('/:id', auth, deleteCoupon);

module.exports = router;
