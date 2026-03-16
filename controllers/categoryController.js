const Category = require('../models/Category');
const Profile = require('../models/Profile');

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
    if (!req.user.role.includes('retailer')) {
      return res.status(403).json({ error: 'Only retailers can create categories' });
    }

    const { name, description, parent } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    if (!parent) {
      return res.status(400).json({ error: 'Parent category is required. You can only create subcategories.' });
    }

    const profile = await Profile.findById(req.user.id).lean();
    if (!profile || !profile.store) {
      return res.status(403).json({ error: 'No store found. Register as a retailer first.' });
    }

    const parentCat = await Category.findById(parent);
    if (!parentCat) {
      return res.status(404).json({ error: 'Parent category not found' });
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
      parent,
      store: profile.store,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    await category.save();

    res.status(201).json({ message: 'Category created', category });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    if (!req.user.role.includes('retailer')) {
      return res.status(403).json({ error: 'Only retailers can update categories' });
    }

    const { name, description } = req.body;

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (category.isSystem) {
      return res.status(403).json({ error: 'System categories cannot be edited' });
    }

    const profile = await Profile.findById(req.user.id).lean();
    if (!profile || !profile.store) {
      return res.status(403).json({ error: 'No store found.' });
    }

    if (name) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const existing = await Category.findOne({ slug, _id: { $ne: category._id } });
      if (existing) {
        return res.status(409).json({ error: 'A category with this name already exists' });
      }
      category.name = name;
      category.slug = slug;
    }

    if (description !== undefined) category.description = description;
    category.updatedBy = req.user.id;

    await category.save();

    res.status(200).json({ message: 'Category updated', category });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    if (!req.user.role.includes('retailer')) {
      return res.status(403).json({ error: 'Only retailers can delete categories' });
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (category.isSystem) {
      return res.status(403).json({ error: 'System categories cannot be deleted' });
    }

    await Category.deleteMany({ parent: category._id });
    await Category.findByIdAndDelete(category._id);

    res.status(200).json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getStoreCategories = async (req, res) => {
  try {
    const profile = await Profile.findById(req.user.id).select('store').lean();
    if (!profile || !profile.store) {
      return res.status(403).json({ error: 'No store found.' });
    }

    const categories = await Category.find({ store: profile.store })
      .select('name slug parent description createdAt')
      .populate('parent', 'name slug')
      .sort({ name: 1 })
      .lean();

    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
