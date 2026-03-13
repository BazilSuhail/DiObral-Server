const Category = require('../models/Category');

const createSubcategory = async (req, res) => {
  try {
    const { name, description, category } = req.body;

    const parent = await Category.findOne({ slug: category });
    if (!parent) {
      return res.status(404).json({ message: 'Parent category not found' });
    }

    const newSubcategory = new Category({
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      description,
      parent: parent._id,
    });

    await newSubcategory.save();
    res.status(201).json({ message: 'Subcategory created successfully', subcategory: newSubcategory });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateSubcategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const updated = await Category.findByIdAndUpdate(
      id,
      { name, description, slug: name?.toLowerCase().replace(/\s+/g, '-') },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'Subcategory not found' });

    res.status(200).json({ message: 'Subcategory updated successfully', subcategory: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteSubcategory = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Category.findByIdAndDelete(id);

    if (!deleted) return res.status(404).json({ message: 'Subcategory not found' });

    res.status(200).json({ message: 'Subcategory deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAllSubcategories = async (req, res) => {
  try {
    const subcategories = await Category.find({ parent: { $ne: null } }).populate('parent');
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
