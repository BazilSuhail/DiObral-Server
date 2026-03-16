const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Product = require('../models/Product');
const Profile = require('../models/Profile');
const Category = require('../models/Category');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
  },
});

const uploadFields = upload.fields([
  { name: 'mainImage', maxCount: 1 },
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 },
  { name: 'image3', maxCount: 1 },
  { name: 'image4', maxCount: 1 },
  { name: 'image5', maxCount: 1 },
]);

const deleteFile = (filename) => {
  if (!filename) return;
  const fp = path.join(__dirname, '..', 'uploads', filename);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
};

exports.uploadMiddleware = (req, res, next) => {
  uploadFields(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 5MB per image.' });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: `Unexpected field: ${err.field}` });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

exports.getProducts = async (req, res) => {
  try {
    const profile = await Profile.findById(req.user.id);
    if (!profile || !profile.store) {
      return res.status(403).json({ error: 'No store found. Register as a retailer first.' });
    }

    const products = await Product.find({ store: profile.store })
      .sort({ createdAt: -1 })
      .populate('category', 'name slug')
      .populate('subcategory', 'name slug')
      .lean();

    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const profile = await Profile.findById(req.user.id);
    if (!profile || !profile.store) {
      return res.status(403).json({ error: 'No store found.' });
    }

    const product = await Product.findOne({ _id: req.params.id, store: profile.store })
      .populate('category', 'name slug')
      .populate('subcategory', 'name slug');

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const profile = await Profile.findById(req.user.id);
    if (!profile || !profile.store) {
      return res.status(403).json({ error: 'No store found. Register as a retailer first.' });
    }

    const { name, description, category, subcategory, price, stock, sale, size, tags } = req.body;

    if (!name || !description || !price || stock === undefined) {
      return res.status(400).json({ error: 'Name, description, price, and stock are required' });
    }

    if (!category || !subcategory) {
      return res.status(400).json({ error: 'Category and subcategory are required' });
    }

    const subCat = await Category.findById(subcategory);
    if (!subCat || !subCat.parent || subCat.parent.toString() !== category) {
      return res.status(400).json({ error: 'Subcategory must belong to the selected category' });
    }

    if (!req.files || !req.files['mainImage']) {
      return res.status(400).json({ error: 'Cover image (mainImage) is required' });
    }

    const extraKeys = ['image1', 'image2', 'image3', 'image4', 'image5'];
    const extraCount = extraKeys.filter((k) => req.files[k]).length;
    if (extraCount < 1) {
      return res.status(400).json({ error: 'At least 1 additional image (image1–image5) is required' });
    }
    if (extraCount > 5) {
      return res.status(400).json({ error: 'Maximum 5 additional images allowed' });
    }

    const mainImage = req.files['mainImage'][0].filename;
    const otherImages = extraKeys
      .map((key) => (req.files[key] ? req.files[key][0].filename : ''))
      .filter(Boolean);

    const product = new Product({
      name,
      description,
      category,
      subcategory,
      store: profile.store,
      createdBy: req.user.id,
      price: Number(price),
      sale: sale ? Number(sale) : 0,
      stock: Number(stock),
      size: size ? size.split(',').map((s) => s.trim()) : [],
      tags: tags ? tags.split(',').map((t) => t.trim()) : [],
      image: mainImage,
      otherImages,
    });

    await product.save();

    res.status(201).json({ message: 'Product created', product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const profile = await Profile.findById(req.user.id);
    if (!profile || !profile.store) {
      return res.status(403).json({ error: 'No store found.' });
    }

    const product = await Product.findOne({ _id: req.params.id, store: profile.store });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const { name, description, category, subcategory, price, stock, sale, size, tags, isActive } = req.body;

    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (category !== undefined) product.category = category;
    if (subcategory !== undefined) {
      const subCat = await Category.findById(subcategory);
      const targetCategory = category || product.category;
      if (!subCat || !subCat.parent || subCat.parent.toString() !== targetCategory.toString()) {
        return res.status(400).json({ error: 'Subcategory must belong to the selected category' });
      }
      product.subcategory = subcategory;
    }
    if (price !== undefined) product.price = Number(price);
    if (stock !== undefined) product.stock = Number(stock);
    if (sale !== undefined) product.sale = Number(sale);
    if (isActive !== undefined) product.isActive = isActive;
    if (size !== undefined) product.size = size.split(',').map((s) => s.trim());
    if (tags !== undefined) product.tags = tags.split(',').map((t) => t.trim());

    if (req.files) {
      if (req.files['mainImage']) {
        deleteFile(product.image);
        product.image = req.files['mainImage'][0].filename;
      }

      ['image1', 'image2', 'image3', 'image4', 'image5'].forEach((key, i) => {
        if (req.files[key]) {
          if (product.otherImages[i]) deleteFile(product.otherImages[i]);
          product.otherImages[i] = req.files[key][0].filename;
        }
      });

      product.otherImages = product.otherImages.filter(Boolean);
    }

    await product.save();

    res.status(200).json({ message: 'Product updated', product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const profile = await Profile.findById(req.user.id);
    if (!profile || !profile.store) {
      return res.status(403).json({ error: 'No store found.' });
    }

    const product = await Product.findOne({ _id: req.params.id, store: profile.store });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    deleteFile(product.image);
    product.otherImages.forEach(deleteFile);

    await Product.findByIdAndDelete(product._id);

    res.status(200).json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
