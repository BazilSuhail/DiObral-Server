const Coupon = require('../models/Coupon');
const Profile = require('../models/Profile');

const generateCode = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// ─── Retailer Coupon CRUD ─────────────────────────────────────

exports.createCoupon = async (req, res) => {
  try {
    const profile = await Profile.findById(req.user.id);
    if (!profile || !profile.store) {
      return res.status(403).json({ error: 'Only retailers can create coupons' });
    }

    const { code, type, value, minOrderAmount, maxDiscount, usageLimit, expiresAt, isActive } = req.body;

    if (!type || value === undefined) {
      return res.status(400).json({ error: 'Type and value are required' });
    }

    if (!['percentage', 'fixed'].includes(type)) {
      return res.status(400).json({ error: 'Type must be percentage or fixed' });
    }

    if (type === 'percentage' && (value < 1 || value > 100)) {
      return res.status(400).json({ error: 'Percentage must be between 1 and 100' });
    }

    if (value < 0) {
      return res.status(400).json({ error: 'Value must be positive' });
    }

    const couponCode = code ? code.toUpperCase() : generateCode();

    const existing = await Coupon.findOne({ store: profile.store, code: couponCode });
    if (existing) {
      return res.status(409).json({ error: 'Coupon code already exists for your store' });
    }

    const coupon = new Coupon({
      store: profile.store,
      code: couponCode,
      type,
      value,
      minOrderAmount: minOrderAmount || 0,
      maxDiscount: maxDiscount || null,
      usageLimit: usageLimit || null,
      expiresAt: expiresAt || null,
      isActive: isActive !== undefined ? isActive : true,
    });

    await coupon.save();

    res.status(201).json({ message: 'Coupon created', coupon });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCoupons = async (req, res) => {
  try {
    const profile = await Profile.findById(req.user.id);
    if (!profile || !profile.store) {
      return res.status(403).json({ error: 'Only retailers can manage coupons' });
    }

    const coupons = await Coupon.find({ store: profile.store }).sort({ createdAt: -1 }).lean();

    // Attach usage info
    const now = new Date();
    const withStatus = coupons.map((c) => ({
      ...c,
      isExpired: c.expiresAt && c.expiresAt < now,
      isExhausted: c.usageLimit && c.usedCount >= c.usageLimit,
    }));

    res.status(200).json(withStatus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateCoupon = async (req, res) => {
  try {
    const profile = await Profile.findById(req.user.id);
    if (!profile || !profile.store) {
      return res.status(403).json({ error: 'Only retailers can manage coupons' });
    }

    const { value, minOrderAmount, maxDiscount, usageLimit, expiresAt, isActive } = req.body;

    const update = {};
    if (value !== undefined) update.value = value;
    if (minOrderAmount !== undefined) update.minOrderAmount = minOrderAmount;
    if (maxDiscount !== undefined) update.maxDiscount = maxDiscount;
    if (usageLimit !== undefined) update.usageLimit = usageLimit;
    if (expiresAt !== undefined) update.expiresAt = expiresAt;
    if (isActive !== undefined) update.isActive = isActive;

    const coupon = await Coupon.findOneAndUpdate(
      { _id: req.params.id, store: profile.store },
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    res.status(200).json({ message: 'Coupon updated', coupon });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    const profile = await Profile.findById(req.user.id);
    if (!profile || !profile.store) {
      return res.status(403).json({ error: 'Only retailers can manage coupons' });
    }

    const coupon = await Coupon.findOneAndDelete({ _id: req.params.id, store: profile.store });
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    res.status(200).json({ message: 'Coupon deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── Public Validation ────────────────────────────────────────

exports.validateCoupon = async (req, res) => {
  try {
    const { code, storeId, orderAmount } = req.body;

    if (!code || !storeId) {
      return res.status(400).json({ error: 'Coupon code and store ID are required' });
    }

    const coupon = await Coupon.findOne({
      store: storeId,
      code: code.toUpperCase(),
      isActive: true,
    });

    if (!coupon) {
      return res.status(404).json({ error: 'Invalid or inactive coupon code' });
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Coupon has expired' });
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ error: 'Coupon usage limit reached' });
    }

    if (orderAmount !== undefined && orderAmount < coupon.minOrderAmount) {
      return res.status(400).json({
        error: `Minimum order amount of $${coupon.minOrderAmount.toFixed(2)} required`,
      });
    }

    let discountAmount = 0;
    if (coupon.type === 'percentage') {
      discountAmount = (orderAmount || 0) * (coupon.value / 100);
      if (coupon.maxDiscount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscount);
      }
    } else {
      discountAmount = coupon.value;
    }

    res.status(200).json({
      valid: true,
      coupon: {
        id: coupon._id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discountAmount: Math.round(discountAmount * 100) / 100,
        maxDiscount: coupon.maxDiscount,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
