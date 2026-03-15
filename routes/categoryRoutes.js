const express = require('express');
const router = express.Router();
const { getCategories, getCategory, createCategory } = require('../controllers/categoryController');
const auth = require('../middleware/authMiddleware');

router.get('/', getCategories);
router.get('/:id', getCategory);
router.post('/', auth, createCategory);

module.exports = router;
