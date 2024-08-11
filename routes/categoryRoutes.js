// routes/categoryRoutes.js

const express = require('express');
const router = express.Router(); 

// Route to get all categories 

const {
    addCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
  } = require('../controllers/categoryController');
  
// Route to create a new category
router.post('/add-category', addCategory);
  router.get('/', getCategories);
  router.get('/:id', getCategoryById);
  router.put('/:id', updateCategory);
  router.delete('/:id', deleteCategory);


module.exports = router;
