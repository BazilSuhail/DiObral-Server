const Bundle = require('../models/Bundle');
const Product = require('../models/Product');
const Profile = require('../models/Profile');

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

    const { name, description, image, items, price, stock, startsAt, expiresAt, maxPerOrder, tags } = req.body;

    if (!name || !items || !items.length || price === undefined) {
      return res.status(400).json({ error: 'Name, items, and price are required' });
    }

    // Validate all products exist and belong to this store
    const productIds = items.map((i) => i.product);
    const products = await Product.find({ _id: { $in: productIds }, store: profile.store });
    if (products.length !== productIds.length) {
      return res.status(400).json({ error: 'One or more products not found or do not belong to your store' });
    }

    // Calculate original total from current product prices
    const originalTotal = items.reduce((sum, item) => {
      const product = products.find((p) => p._id.toString() === item.product);
      return sum + (product.price * (item.quantity || 1));
    }, 0);

    if (price >= originalTotal) {
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
      image: image || '',
      items: items.map((i) => ({ product: i.product, quantity: i.quantity || 1 })),
      price,
      originalTotal,
      stock: stock ?? 0,
      startsAt: startsAt || null,
      expiresAt: expiresAt || null,
      maxPerOrder: maxPerOrder || null,
      tags: tags || [],
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

    const { name, description, image, items, price, stock, startsAt, expiresAt, maxPerOrder, tags, isActive } = req.body;

    if (name !== undefined) bundle.name = name;
    if (description !== undefined) bundle.description = description;
    if (image !== undefined) bundle.image = image;
    if (price !== undefined) bundle.price = price;
    if (stock !== undefined) bundle.stock = stock;
    if (startsAt !== undefined) bundle.startsAt = startsAt;
    if (expiresAt !== undefined) bundle.expiresAt = expiresAt;
    if (maxPerOrder !== undefined) bundle.maxPerOrder = maxPerOrder;
    if (tags !== undefined) bundle.tags = tags;
    if (isActive !== undefined) bundle.isActive = isActive;

    if (items !== undefined) {
      const productIds = items.map((i) => i.product);
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

    res.status(200).json({ message: 'Bundle deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── Public ────────────────────────────────────────────────────

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
