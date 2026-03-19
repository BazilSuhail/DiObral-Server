const CartState = require('../models/CartState');
const Product = require('../models/Product');
const Bundle = require('../models/Bundle');

const populateCart = (query) =>
  query
    .populate('items.product', 'name price sale image stock isActive')
    .populate('items.bundle', 'name price image store originalTotal stock isActive');

exports.getCart = async (req, res) => {
  try {
    let cart = await populateCart(CartState.findOne({ userId: req.user.id })).lean();

    if (!cart) {
      return res.status(200).json({ items: [] });
    }

    // Filter out items where the product/bundle no longer exists or is inactive
    cart.items = cart.items.filter((item) => {
      if (item.itemType === 'bundle') return item.bundle && item.bundle.isActive;
      return item.product && item.product.isActive;
    });

    res.status(200).json(cart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const { productId, bundleId, quantity = 1, size } = req.body;

    if (bundleId) {
      const bundle = await Bundle.findById(bundleId);
      if (!bundle || !bundle.isActive) {
        return res.status(404).json({ error: 'Bundle not found or unavailable' });
      }

      const now = new Date();
      if ((bundle.startsAt && bundle.startsAt > now) || (bundle.expiresAt && bundle.expiresAt < now)) {
        return res.status(400).json({ error: 'Bundle is not available right now' });
      }

      const stockLimit = bundle.stock > 0 ? bundle.stock : Infinity;
      if (quantity > stockLimit) {
        return res.status(400).json({ error: `Only ${bundle.stock} in stock` });
      }
      if (bundle.maxPerOrder && quantity > bundle.maxPerOrder) {
        return res.status(400).json({ error: `Maximum ${bundle.maxPerOrder} per order` });
      }

      let cart = await CartState.findOne({ userId: req.user.id });
      if (!cart) {
        cart = new CartState({ userId: req.user.id, items: [] });
      }

      const existingIndex = cart.items.findIndex(
        (item) => item.itemType === 'bundle' && item.bundle && item.bundle.toString() === bundleId
      );

      if (existingIndex > -1) {
        cart.items[existingIndex].quantity += quantity;
        if (cart.items[existingIndex].quantity > stockLimit) {
          cart.items[existingIndex].quantity = stockLimit;
        }
      } else {
        cart.items.push({
          itemType: 'bundle',
          bundle: bundleId,
          quantity,
          size: '',
          price: bundle.price,
          store: bundle.store,
          bundleName: bundle.name,
          image: bundle.image,
        });
      }

      await cart.save();

      const populated = await populateCart(CartState.findById(cart._id)).lean();
      return res.status(200).json({ message: 'Bundle added to cart', cart: populated });
    }

    if (!productId || !size) {
      return res.status(400).json({ error: 'Product ID and size are required' });
    }

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ error: 'Product not found or unavailable' });
    }

    if (quantity > product.stock) {
      return res.status(400).json({ error: `Only ${product.stock} in stock` });
    }

    if (product.size.length && size && !product.size.includes(size)) {
      return res.status(400).json({ error: `Invalid size. Available: ${product.size.join(', ')}` });
    }

    const salePrice = product.sale > 0
      ? product.price - (product.price * product.sale) / 100
      : product.price;

    let cart = await CartState.findOne({ userId: req.user.id });

    if (!cart) {
      cart = new CartState({
        userId: req.user.id,
        items: [],
      });
    }

    const existingIndex = cart.items.findIndex(
      (item) => item.product && item.product.toString() === productId && item.size === size
    );

    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += quantity;
      if (cart.items[existingIndex].quantity > product.stock) {
        cart.items[existingIndex].quantity = product.stock;
      }
    } else {
      cart.items.push({
        itemType: 'product',
        product: productId,
        quantity,
        size,
        price: salePrice,
        store: product.store,
      });
    }

    await cart.save();

    const populated = await populateCart(CartState.findById(cart._id)).lean();

    res.status(200).json({ message: 'Added to cart', cart: populated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateCartItem = async (req, res) => {
  try {
    const { quantity } = req.body;
    const { itemId } = req.params;

    if (quantity === undefined || quantity === null || quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    const cart = await CartState.findOne({ userId: req.user.id });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }

    if (item.itemType === 'bundle') {
      const bundle = item.bundle
        ? await Bundle.findById(item.bundle)
        : null;
      if (bundle && bundle.stock > 0 && quantity > bundle.stock) {
        return res.status(400).json({ error: `Only ${bundle.stock} in stock` });
      }
    } else {
      const product = await Product.findById(item.product);
      if (product && quantity > product.stock) {
        return res.status(400).json({ error: `Only ${product.stock} in stock` });
      }
    }

    item.quantity = quantity;
    await cart.save();

    const populated = await populateCart(CartState.findById(cart._id)).lean();

    res.status(200).json({ cart: populated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.removeCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    const cart = await CartState.findOne({ userId: req.user.id });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    cart.items = cart.items.filter((item) => item._id.toString() !== itemId);
    await cart.save();

    const populated = await populateCart(CartState.findById(cart._id)).lean();

    res.status(200).json({ cart: populated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.clearCart = async (req, res) => {
  try {
    await CartState.findOneAndUpdate(
      { userId: req.user.id },
      { $set: { items: [] } }
    );

    res.status(200).json({ message: 'Cart cleared', items: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
