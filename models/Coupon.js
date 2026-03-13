const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema({
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
  },
  code: {
    type: String,
    required: true,
    uppercase: true,
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true,
  },
  value: {
    type: Number,
    required: true,
  },
  minOrderAmount: {
    type: Number,
    default: 0,
  },
  maxDiscount: {
    type: Number,
    default: null,
  },
  usageLimit: {
    type: Number,
    default: null,
  },
  usedCount: {
    type: Number,
    default: 0,
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

CouponSchema.index({ store: 1, code: 1 }, { unique: true });
CouponSchema.index({ code: 1 });

module.exports = mongoose.model('Coupon', CouponSchema);
