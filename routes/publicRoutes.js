const express = require('express');
const router = express.Router();
const {
  listProducts,
  getProduct,
  listStores,
  getStorefront,
  getHomepage,
} = require('../controllers/publicController');
const { publicLimiter, searchLimiter, heavyLimiter } = require('../middleware/rateLimiter');

router.get('/home', heavyLimiter, getHomepage);
router.get('/products', searchLimiter, listProducts);
router.get('/products/:id', publicLimiter, getProduct);
router.get('/stores', publicLimiter, listStores);
router.get('/stores/:slug', publicLimiter, getStorefront);

module.exports = router;
