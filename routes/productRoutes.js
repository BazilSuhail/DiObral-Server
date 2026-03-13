const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadMiddleware,
} = require('../controllers/productController');
const auth = require('../middleware/authMiddleware');

router.use(auth);

router.get('/', getProducts);
router.get('/:id', getProduct);
router.post('/', uploadMiddleware, createProduct);
router.put('/:id', uploadMiddleware, updateProduct);
router.delete('/:id', deleteProduct);

module.exports = router;
