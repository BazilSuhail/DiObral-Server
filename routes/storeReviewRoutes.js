const express = require('express');
const router = express.Router();
const { submitStoreReview, getStoreReviews, deleteStoreReview } = require('../controllers/storeReviewController');
const auth = require('../middleware/authMiddleware');

// Public
router.get('/:storeId', getStoreReviews);

// Auth required
router.post('/', auth, submitStoreReview);
router.delete('/:id', auth, deleteStoreReview);

module.exports = router;
