// routes/subcategoryRoutes.js
const express = require('express');
const router = express.Router();
const {
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  getAllSubcategories,
} = require('../controllers/subcategoryController');

// Route to get all subcategories
router.get('/', getAllSubcategories);

// Route to create a new subcategory
router.post('/', createSubcategory);

// Route to update a subcategory
router.put('/:id', updateSubcategory);

// Route to delete a subcategory
router.delete('/:id', deleteSubcategory);

module.exports = router;
