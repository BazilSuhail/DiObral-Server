const Category = require('../models/Category');

exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ parent: null })
      .sort({ name: 1 })
      .lean();

    const withChildren = await Promise.all(
      categories.map(async (cat) => {
        const children = await Category.find({ parent: cat._id })
          .sort({ name: 1 })
          .lean();
        return { ...cat, children };
      })
    );

    res.status(200).json(withChildren);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).lean();
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const children = await Category.find({ parent: category._id })
      .sort({ name: 1 })
      .lean();

    res.status(200).json({ ...category, children });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, description, parent } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const existing = await Category.findOne({ slug });
    if (existing) {
      return res.status(409).json({ error: 'Category already exists' });
    }

    const category = new Category({
      name,
      slug,
      description: description || '',
      parent: parent || null,
    });

    await category.save();

    res.status(201).json({ message: 'Category created', category });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
