const CartState = require('../models/CartState');
const Product = require('../models/Product');

exports.getCart = async (req, res) => {
  try {
    let cart = await CartState.findOne({ userId: req.user.id })
      .populate('items.product', 'name price sale image stock isActive')
      .lean();

    if (!cart) {
      return res.status(200).json({ items: [] });
    }

    // Filter out items where product no longer exists or is inactive
    cart.items = cart.items.filter((item) => item.product && item.product.isActive);

    res.status(200).json(cart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1, size } = req.body;

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
      (item) => item.product.toString() === productId && item.size === size
    );

    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += quantity;
      if (cart.items[existingIndex].quantity > product.stock) {
        cart.items[existingIndex].quantity = product.stock;
      }
    } else {
      cart.items.push({
        product: productId,
        quantity,
        size,
        price: salePrice,
        store: product.store,
      });
    }

    await cart.save();

    const populated = await CartState.findById(cart._id)
      .populate('items.product', 'name price sale image stock isActive')
      .lean();

    res.status(200).json({ message: 'Added to cart', cart: populated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateCartItem = async (req, res) => {
  try {
    const { quantity } = req.body;
    const { itemId } = req.params;

    if (!quantity || quantity < 1) {
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

    const product = await Product.findById(item.product);
    if (product && quantity > product.stock) {
      return res.status(400).json({ error: `Only ${product.stock} in stock` });
    }

    item.quantity = quantity;
    await cart.save();

    const populated = await CartState.findById(cart._id)
      .populate('items.product', 'name price sale image stock isActive')
      .lean();

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

    const populated = await CartState.findById(cart._id)
      .populate('items.product', 'name price sale image stock isActive')
      .lean();

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
