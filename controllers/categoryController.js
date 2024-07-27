// controllers/categoryController.js

const Category = require('../models/category');

// Add a new category
const addCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    const newCategory = new Category({
      name,
      description,
    });

    await newCategory.save();
    res.status(201).json({ message: 'Category created successfully', category: newCategory });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Get all categories
const getCategories = async (req, res) => {
    try {
      const categories = await Category.find();
      res.status(200).json(categories);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
  // Get a single category by ID
  const getCategoryById = async (req, res) => {
    try {
      const { id } = req.params;
      const category = await Category.findById(id);
      if (!category) return res.status(404).json({ message: 'Category not found' });
      res.status(200).json(category);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
  // Update category
  const updateCategory = async (req, res) => {
    try {
      const { id } = req.params;
      const updatedCategory = await Category.findByIdAndUpdate(id, req.body, { new: true });
      if (!updatedCategory) return res.status(404).json({ message: 'Category not found' });
      res.status(200).json({ message: 'Category updated successfully', category: updatedCategory });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
  // Delete category
  const deleteCategory = async (req, res) => {
    try {
      const { id } = req.params;
      const deletedCategory = await Category.findByIdAndDelete(id);
      if (!deletedCategory) return res.status(404).json({ message: 'Category not found' });
      res.status(200).json({ message: 'Category deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  

module.exports = { getCategoryById, updateCategory, deleteCategory , addCategory, getCategories };
