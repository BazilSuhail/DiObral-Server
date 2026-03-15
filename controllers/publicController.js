const Product = require('../models/Product');
const Store = require('../models/Store');
const Category = require('../models/Category');

exports.listProducts = async (req, res) => {
  try {
    const {
      category,
      store,
      search,
      minPrice,
      maxPrice,
      sort,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = { isActive: true };

    if (category) filter.category = category;
    if (store) filter.store = store;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'price_asc') sortOption = { price: 1 };
    else if (sort === 'price_desc') sortOption = { price: -1 };
    else if (sort === 'rating') sortOption = { rating: -1 };
    else if (sort === 'newest') sortOption = { createdAt: -1 };
    else if (sort === 'popular') sortOption = { favCount: -1 };

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(Number(limit))
        .populate('store', 'storeName slug logo')
        .populate('category', 'name slug')
        .lean(),
      Product.countDocuments(filter),
    ]);

    res.status(200).json({
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, isActive: true })
      .populate('store', 'storeName slug logo rating')
      .populate('category', 'name slug');

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Fetch related products from same store and category
    const related = await Product.find({
      _id: { $ne: product._id },
      store: product.store,
      isActive: true,
    })
      .limit(4)
      .select('name price image rating store')
      .populate('store', 'storeName slug')
      .lean();

    res.status(200).json({ product, related });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.listStores = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [stores, total] = await Promise.all([
      Store.find()
        .sort({ followerCount: -1 })
        .skip(skip)
        .limit(limit)
        .populate('ownedBy', 'fullName')
        .lean(),
      Store.countDocuments(),
    ]);

    const withCounts = await Promise.all(
      stores.map(async (store) => {
        const productCount = await Product.countDocuments({ store: store._id, isActive: true });
        return { ...store, productCount };
      })
    );

    res.status(200).json({
      stores: withCounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getStorefront = async (req, res) => {
  try {
    const store = await Store.findOne({ slug: req.params.slug })
      .populate('ownedBy', 'fullName email');

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const products = await Product.find({ store: store._id, isActive: true })
      .sort({ createdAt: -1 })
      .populate('category', 'name slug')
      .lean();

    const categories = await Category.find({
      _id: { $in: [...new Set(products.map((p) => p.category).filter(Boolean))] },
    }).lean();

    const stats = {
      productCount: products.length,
      rating: store.rating,
      ratingCount: store.ratingCount,
      followerCount: store.followerCount,
    };

    res.status(200).json({ store, products, categories, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getHomepage = async (req, res) => {
  try {
    const [latest, topRated, popular] = await Promise.all([
      Product.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(8)
        .populate('store', 'storeName slug')
        .lean(),
      Product.find({ isActive: true, rating: { $gt: 0 } })
        .sort({ rating: -1 })
        .limit(8)
        .populate('store', 'storeName slug')
        .lean(),
      Product.find({ isActive: true })
        .sort({ favCount: -1 })
        .limit(8)
        .populate('store', 'storeName slug')
        .lean(),
    ]);

    const stores = await Store.find()
      .sort({ followerCount: -1 })
      .limit(6)
      .lean();

    res.status(200).json({ latest, topRated, popular, stores });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
