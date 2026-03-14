const Profile = require('../models/Profile');
const Product = require('../models/Product');
const Store = require('../models/Store');

// ─── Product Wishlist ───────────────────────────────────────────

exports.toggleWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const profile = await Profile.findById(req.user.id);
    const already = profile.favProducts.some((id) => id.toString() === productId);

    if (already) {
      await Profile.findByIdAndUpdate(req.user.id, {
        $pull: { favProducts: productId },
        $inc: { favProductCount: -1 },
      });
      await Product.findByIdAndUpdate(productId, { $inc: { favCount: -1 } });
      return res.status(200).json({ wishlisted: false });
    }

    await Profile.findByIdAndUpdate(req.user.id, {
      $addToSet: { favProducts: productId },
      $inc: { favProductCount: 1 },
    });
    await Product.findByIdAndUpdate(productId, { $inc: { favCount: 1 } });

    res.status(200).json({ wishlisted: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getWishlist = async (req, res) => {
  try {
    const profile = await Profile.findById(req.user.id)
      .populate({
        path: 'favProducts',
        select: 'name price sale image rating stock isActive store',
        populate: { path: 'store', select: 'storeName slug' },
      })
      .lean();

    res.status(200).json(profile.favProducts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.checkWishlist = async (req, res) => {
  try {
    const profile = await Profile.findById(req.user.id).select('favProducts').lean();
    const wishlisted = profile.favProducts.map((id) => id.toString());

    // Accept ?ids=id1,id2,id3 or a single :productId param
    const ids = req.params.productId
      ? [req.params.productId]
      : (req.query.ids ? req.query.ids.split(',') : []);

    const result = {};
    ids.forEach((id) => { result[id] = wishlisted.includes(id); });

    res.status(200).json(req.params.productId ? { wishlisted: result[ids[0]] } : result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── Store Follow ──────────────────────────────────────────────

exports.toggleFollow = async (req, res) => {
  try {
    const { storeId } = req.params;

    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const profile = await Profile.findById(req.user.id);
    const already = profile.favStores.some((id) => id.toString() === storeId);

    if (already) {
      await Profile.findByIdAndUpdate(req.user.id, {
        $pull: { favStores: storeId },
        $inc: { favStoreCount: -1 },
      });
      await Store.findByIdAndUpdate(storeId, { $inc: { followerCount: -1 } });
      return res.status(200).json({ following: false });
    }

    await Profile.findByIdAndUpdate(req.user.id, {
      $addToSet: { favStores: storeId },
      $inc: { favStoreCount: 1 },
    });
    await Store.findByIdAndUpdate(storeId, { $inc: { followerCount: 1 } });

    res.status(200).json({ following: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getFollowedStores = async (req, res) => {
  try {
    const profile = await Profile.findById(req.user.id)
      .populate({
        path: 'favStores',
        select: 'storeName slug logo description rating ratingCount',
      })
      .lean();

    res.status(200).json(profile.favStores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
