const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  },
  name: { type: String, required: true },
  image: { type: String, required: true },
  price: { type: Number, required: true },
  discountedPrice: { type: Number, required: true },
  quantity: { type: Number, required: true },
  size: { type: String, required: true },
  bundleGroupId: { type: String, default: null },
  bundleName: { type: String, default: null },
});

const OrderSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    required: true,
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
  },
  groupOrderId: {
    type: String,
  },
  items: [OrderItemSchema],
  shippingAddress: {
    city: { type: String, required: true },
    state: { type: String, required: true },
    street: { type: String, required: true },
    country: { type: String, required: true },
  },
  contactPhone: { type: String },
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  },
  coupon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
    default: null,
  },
  trackingNumber: { type: String, default: '' },
  notes: { type: String, default: '' },
}, { timestamps: true });

OrderSchema.index({ customer: 1, createdAt: -1 });
OrderSchema.index({ store: 1, status: 1, createdAt: -1 });
OrderSchema.index({ groupOrderId: 1 });
OrderSchema.index({ status: 1 });

module.exports = mongoose.model('Order', OrderSchema);
