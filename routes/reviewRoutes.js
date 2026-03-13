const express = require('express');
const router = express.Router();
const {
  submitReview,
  getProductReviews,
  updateReview,
  deleteReview,
  getCustomerReviews,
} = require('../controllers/reviewController');
const auth = require('../middleware/authMiddleware');

// Public
router.get('/product/:productId', getProductReviews);

// Auth required
router.post('/', auth, submitReview);
router.put('/:id', auth, updateReview);
router.delete('/:id', auth, deleteReview);
router.get('/mine', auth, getCustomerReviews);

module.exports = router;
