const express = require('express');
const router = express.Router();
const {
  getBundles,
  getBundle,
  createBundle,
  updateBundle,
  deleteBundle,
  getStoreBundles,
  getBundleDetail,
  uploadBundleImage,
} = require('../controllers/bundleController');
const auth = require('../middleware/authMiddleware');

// Public
router.get('/store/:storeId', getStoreBundles);
router.get('/store/slug/:slug', getStoreBundles);
router.get('/public/:id', getBundleDetail);

// Retailer (auth required)
router.get('/', auth, getBundles);
router.get('/:id', auth, getBundle);
router.post('/', auth, uploadBundleImage, createBundle);
router.put('/:id', auth, uploadBundleImage, updateBundle);
router.delete('/:id', auth, deleteBundle);

module.exports = router;
