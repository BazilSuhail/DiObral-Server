const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Bundle = require('../models/Bundle');
const Product = require('../models/Product');
const Profile = require('../models/Profile');

const isValidIds = (ids) => ids.every((id) => mongoose.Types.ObjectId.isValid(id));

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

exports.uploadBundleImage = upload.single('image');

const deleteFile = (filename) => {
  if (!filename) return;
  const fp = path.join(__dirname, '..', 'uploads', filename);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
};

const parseJsonArray = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// ─── Retailer CRUD ─────────────────────────────────────────────

exports.getBundles = async (req, res) => {
  try {
    const profile = await Profile.findById(req.user.id);
    if (!profile || !profile.store) {
      return res.status(403).json({ error: 'No store found' });
    }

    const bundles = await Bundle.find({ store: profile.store })
      .sort({ createdAt: -1 })
      .populate('items.product', 'name price image stock isActive')
      .lean();

    const now = new Date();
    const withStatus = bundles.map((b) => ({
      ...b,
      isExpired: b.expiresAt && b.expiresAt < now,
      isScheduled: b.startsAt && b.startsAt > now,
    }));

    res.status(200).json(withStatus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getBundle = async (req, res) => {
  try {
    const profile = await Profile.findById(req.user.id);
    if (!profile || !profile.store) {
      return res.status(403).json({ error: 'No store found' });
    }

    const bundle = await Bundle.findOne({ _id: req.params.id, store: profile.store })
      .populate('items.product', 'name price image stock isActive size');

    if (!bundle) {
      return res.status(404).json({ error: 'Bundle not found' });
    }

    res.status(200).json(bundle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createBundle = async (req, res) => {
  try {
    const profile = await Profile.findById(req.user.id);
    if (!profile || !profile.store) {
      return res.status(403).json({ error: 'No store found' });
    }

    const { name, description, price, stock, startsAt, expiresAt, maxPerOrder } = req.body;

    const items = parseJsonArray(req.body.items);
    const tags = parseJsonArray(req.body.tags);
    const image = req.file ? req.file.filename : req.body.image || '';

    if (!name || !items.length || price === undefined || price === '') {
      return res.status(400).json({ error: 'Name, items, and price are required' });
    }

    // Validate all products exist and belong to this store
    const productIds = items.map((i) => i.product);
    if (!isValidIds(productIds)) {
      return res.status(400).json({ error: 'One or more product IDs are invalid' });
    }
    const products = await Product.find({ _id: { $in: productIds }, store: profile.store });
    if (products.length !== productIds.length) {
      return res.status(400).json({ error: 'One or more products not found or do not belong to your store' });
    }

    // Calculate original total from current product prices
    const originalTotal = items.reduce((sum, item) => {
      const product = products.find((p) => p._id.toString() === item.product);
      return sum + (product.price * (item.quantity || 1));
    }, 0);

    if (Number(price) >= originalTotal) {
      return res.status(400).json({ error: 'Bundle price must be less than the sum of individual prices' });
    }

    // Check stock availability for each component
    for (const item of items) {
      const product = products.find((p) => p._id.toString() === item.product);
      const qty = item.quantity || 1;
      if (product.stock < qty) {
        return res.status(400).json({
          error: `"${product.name}" only has ${product.stock} in stock, bundle needs ${qty}`,
        });
      }
    }

    const bundle = new Bundle({
      store: profile.store,
      name,
      description: description || '',
      image,
      items: items.map((i) => ({ product: i.product, quantity: i.quantity || 1 })),
      price: Number(price),
      originalTotal,
      stock: stock !== undefined && stock !== '' ? Number(stock) : 0,
      startsAt: startsAt || null,
      expiresAt: expiresAt || null,
      maxPerOrder: maxPerOrder !== undefined && maxPerOrder !== '' ? Number(maxPerOrder) : null,
      tags,
    });

    await bundle.save();

    const populated = await Bundle.findById(bundle._id)
      .populate('items.product', 'name price image')
      .lean();

    res.status(201).json({ message: 'Bundle created', bundle: populated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateBundle = async (req, res) => {
  try {
    const profile = await Profile.findById(req.user.id);
    if (!profile || !profile.store) {
      return res.status(403).json({ error: 'No store found' });
    }

    const bundle = await Bundle.findOne({ _id: req.params.id, store: profile.store });
    if (!bundle) {
      return res.status(404).json({ error: 'Bundle not found' });
    }

    const { name, description, price, stock, startsAt, expiresAt, maxPerOrder, isActive } = req.body;
    const tags = parseJsonArray(req.body.tags);
    const items = parseJsonArray(req.body.items);

    if (name !== undefined) bundle.name = name;
    if (description !== undefined) bundle.description = description;
    if (req.file) {
      if (bundle.image) deleteFile(bundle.image);
      bundle.image = req.file.filename;
    }
    if (price !== undefined && price !== '') bundle.price = Number(price);
    if (stock !== undefined && stock !== '') bundle.stock = Number(stock);
    if (startsAt !== undefined) bundle.startsAt = startsAt || null;
    if (expiresAt !== undefined) bundle.expiresAt = expiresAt || null;
    if (maxPerOrder !== undefined && maxPerOrder !== '') bundle.maxPerOrder = Number(maxPerOrder);
    if (req.body.tags !== undefined) bundle.tags = tags;
    if (isActive !== undefined) bundle.isActive = isActive;

    if (req.body.items !== undefined) {
      if (!items.length) {
        return res.status(400).json({ error: 'Bundle must have at least one item' });
      }
      const productIds = items.map((i) => i.product);
      if (!isValidIds(productIds)) {
        return res.status(400).json({ error: 'One or more product IDs are invalid' });
      }
      const products = await Product.find({ _id: { $in: productIds }, store: profile.store });
      if (products.length !== productIds.length) {
        return res.status(400).json({ error: 'One or more products not found' });
      }

      bundle.items = items.map((i) => ({ product: i.product, quantity: i.quantity || 1 }));

      bundle.originalTotal = items.reduce((sum, item) => {
        const product = products.find((p) => p._id.toString() === item.product);
        return sum + (product.price * (item.quantity || 1));
      }, 0);
    }

    await bundle.save();

    const populated = await Bundle.findById(bundle._id)
      .populate('items.product', 'name price image')
      .lean();

    res.status(200).json({ message: 'Bundle updated', bundle: populated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteBundle = async (req, res) => {
  try {
    const profile = await Profile.findById(req.user.id);
    if (!profile || !profile.store) {
      return res.status(403).json({ error: 'No store found' });
    }

    const bundle = await Bundle.findOneAndDelete({ _id: req.params.id, store: profile.store });
    if (!bundle) {
      return res.status(404).json({ error: 'Bundle not found' });
    }

    deleteFile(bundle.image);

    res.status(200).json({ message: 'Bundle deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── Public ────────────────────────────────────────────────────

exports.getPublicBundles = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
    const now = new Date();

    const filter = {
      isActive: true,
      $or: [{ expiresAt: { $gte: now } }, { expiresAt: null }],
      $and: [{ $or: [{ startsAt: { $lte: now } }, { startsAt: null }] }],
    };

    if (req.query.storeId || req.query.store) filter.store = req.query.storeId || req.query.store;
    if (req.query.slug) {
      const Store = require('../models/Store');
      const store = await Store.findOne({ slug: req.query.slug });
      if (!store) return res.status(404).json({ error: 'Store not found' });
      filter.store = store._id;
    }
    if (req.query.search) {
      const escaped = String(req.query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (escaped) {
        filter.$and.push({
          $or: [
            { name: { $regex: escaped, $options: 'i' } },
            { tags: { $regex: escaped, $options: 'i' } },
          ],
        });
      }
    }

    const sort = req.query.sort;
    let sortOption = { createdAt: -1 };
    if (sort === 'price_asc') sortOption = { price: 1 };
    else if (sort === 'price_desc') sortOption = { price: -1 };

    const [total, bundles] = await Promise.all([
      Bundle.countDocuments(filter),
      Bundle.find(filter)
        .sort(sortOption)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('store', 'storeName slug')
        .populate('items.product', 'name price image stock')
        .lean(),
    ]);

    const withSavings = bundles.map((b) => ({
      ...b,
      youSave: (b.originalTotal || 0) - (b.price || 0),
      youSavePercent: b.originalTotal
        ? Math.round(((b.originalTotal - b.price) / b.originalTotal) * 100)
        : 0,
    }));

    res.status(200).json({
      bundles: withSavings,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getStoreBundles = async (req, res) => {
  try {
    const { storeId, slug } = req.params;
    const filter = { isActive: true };

    if (storeId) filter.store = storeId;
    if (slug) {
      const Store = require('../models/Store');
      const store = await Store.findOne({ slug });
      if (!store) return res.status(404).json({ error: 'Store not found' });
      filter.store = store._id;
    }

    const now = new Date();
    filter.$or = [
      { expiresAt: { $gte: now } },
      { expiresAt: null },
    ];
    filter.$and = [
      { $or: [{ startsAt: { $lte: now } }, { startsAt: null }] },
    ];

    const bundles = await Bundle.find(filter)
      .populate('items.product', 'name price image stock')
      .lean();

    const withSavings = bundles.map((b) => ({
      ...b,
      youSave: b.originalTotal - b.price,
      youSavePercent: Math.round(((b.originalTotal - b.price) / b.originalTotal) * 100),
    }));

    res.status(200).json(withSavings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getBundleDetail = async (req, res) => {
  try {
    const bundle = await Bundle.findOne({ _id: req.params.id, isActive: true })
      .populate('items.product', 'name price image stock description size')
      .populate('store', 'storeName slug');

    if (!bundle) {
      return res.status(404).json({ error: 'Bundle not found' });
    }

    const now = new Date();
    if ((bundle.startsAt && bundle.startsAt > now) || (bundle.expiresAt && bundle.expiresAt < now)) {
      return res.status(404).json({ error: 'Bundle not available' });
    }

    res.status(200).json({
      ...bundle.toObject(),
      youSave: bundle.originalTotal - bundle.price,
      youSavePercent: Math.round(((bundle.originalTotal - bundle.price) / bundle.originalTotal) * 100),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
