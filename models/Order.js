const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  itemType: {
    type: String,
    enum: ['product', 'bundle'],
    default: 'product',
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null,
  },
  bundle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bundle',
    default: null,
  },
  name: { type: String, required: true },
  image: { type: String, default: '' },
  price: { type: Number, required: true },
  discountedPrice: { type: Number, required: true },
  quantity: { type: Number, required: true },
  size: { type: String, default: '' },
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
  shipping: { type: Number, default: 0 },
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
  paymentStatus: {
    type: String,
    enum: ['requires_payment', 'paid', 'failed', 'refunded'],
    default: 'requires_payment',
  },
  paymentIntentId: { type: String, default: '' },
  paymentMethod: { type: String, default: '' },
  amountPaid: { type: Number, default: 0 },
  paidAt: { type: Date },
}, { timestamps: true });

OrderSchema.index({ customer: 1, createdAt: -1 });
OrderSchema.index({ store: 1, status: 1, createdAt: -1 });
OrderSchema.index({ groupOrderId: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ paymentIntentId: 1 });

module.exports = mongoose.model('Order', OrderSchema);
