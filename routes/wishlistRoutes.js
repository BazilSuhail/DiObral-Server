const express = require('express');
const router = express.Router();
const {
  toggleWishlist,
  getWishlist,
  checkWishlist,
  toggleFollow,
  getFollowedStores,
} = require('../controllers/wishlistController');
const auth = require('../middleware/authMiddleware');

router.use(auth);

// Products
router.get('/products', getWishlist);
router.get('/products/check', checkWishlist);
router.get('/products/check/:productId', checkWishlist);
router.post('/products/:productId', toggleWishlist);

// Stores
router.get('/stores', getFollowedStores);
router.post('/stores/:storeId', toggleFollow);

module.exports = router;
