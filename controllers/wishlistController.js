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
      console.log('toggleWishlist response:', { wishlisted: false });
      return res.status(200).json({ wishlisted: false });
    }

    await Profile.findByIdAndUpdate(req.user.id, {
      $addToSet: { favProducts: productId },
      $inc: { favProductCount: 1 },
    });
    await Product.findByIdAndUpdate(productId, { $inc: { favCount: 1 } });

    console.log('toggleWishlist response:', { wishlisted: true });
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

    const valid = (profile.favProducts || []).filter(Boolean);
    console.log('getWishlist response:', JSON.stringify(valid, null, 2));
    res.status(200).json(valid);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.checkWishlist = async (req, res) => {
  try {
    const profile = await Profile.findById(req.user.id).select('favProducts').lean();
    const wishlisted = (profile.favProducts || []).map((id) => id.toString());

    const ids = req.query.ids ? req.query.ids.split(',') : [];
    const result = {};
    ids.forEach((id) => { result[id] = wishlisted.includes(id); });

    console.log('checkWishlist response:', JSON.stringify(result, null, 2));
    res.status(200).json(result);
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
      console.log('toggleFollow response:', { following: false });
      return res.status(200).json({ following: false });
    }

    await Profile.findByIdAndUpdate(req.user.id, {
      $addToSet: { favStores: storeId },
      $inc: { favStoreCount: 1 },
    });
    await Store.findByIdAndUpdate(storeId, { $inc: { followerCount: 1 } });

    console.log('toggleFollow response:', { following: true });
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

    const valid = (profile.favStores || []).filter(Boolean);
    console.log('getFollowedStores response:', JSON.stringify(valid, null, 2));
    res.status(200).json(valid);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
