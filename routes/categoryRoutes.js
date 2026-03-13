const express = require('express');
const router = express.Router();
const { getCategories, getCategory, createCategory } = require('../controllers/categoryController');

router.get('/', getCategories);
router.get('/:id', getCategory);
router.post('/', createCategory);

module.exports = router;
