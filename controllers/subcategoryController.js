// controllers/subcategoryController.js
const Subcategory = require('../models/subcategory');
const Category = require('../models/category'); // Assuming you have a Category model

// Create a subcategory
const createSubcategory = async (req, res) => {
  try {
    const { name, description, category } = req.body;

    const newSubcategory = new Subcategory({
      name,
      description,
      category,
    });

    await newSubcategory.save();
    res.status(201).json({ message: 'Subcategory created successfully', subcategory: newSubcategory });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a subcategory
const updateSubcategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category } = req.body;

    const updatedSubcategory = await Subcategory.findByIdAndUpdate(id, { name, description, category }, { new: true });

    if (!updatedSubcategory) return res.status(404).json({ message: 'Subcategory not found' });

    res.status(200).json({ message: 'Subcategory updated successfully', subcategory: updatedSubcategory });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a subcategory
const deleteSubcategory = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedSubcategory = await Subcategory.findByIdAndDelete(id);

    if (!deletedSubcategory) return res.status(404).json({ message: 'Subcategory not found' });

    res.status(200).json({ message: 'Subcategory deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all subcategories
const getAllSubcategories = async (req, res) => {
  try {
    const subcategories = await Subcategory.find();
    res.status(200).json(subcategories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  getAllSubcategories,
};
