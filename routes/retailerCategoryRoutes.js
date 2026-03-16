const express = require('express');
const router = express.Router();
const { createCategory, updateCategory, deleteCategory, getStoreCategories } = require('../controllers/categoryController');
const auth = require('../middleware/authMiddleware');

router.get('/', auth, getStoreCategories);
router.post('/', auth, createCategory);
router.put('/:id', auth, updateCategory);
router.delete('/:id', auth, deleteCategory);

module.exports = router;
