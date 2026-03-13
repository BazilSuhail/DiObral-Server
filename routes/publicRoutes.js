const express = require('express');
const router = express.Router();
const {
  listProducts,
  getProduct,
  listStores,
  getStorefront,
  getHomepage,
} = require('../controllers/publicController');

router.get('/home', getHomepage);
router.get('/products', listProducts);
router.get('/products/:id', getProduct);
router.get('/stores', listStores);
router.get('/stores/:slug', getStorefront);

module.exports = router;
