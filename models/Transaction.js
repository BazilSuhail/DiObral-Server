const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
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
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  groupOrderId: { type: String },
  stripePaymentIntentId: { type: String, unique: true, sparse: true },
  idempotencyKey: { type: String },
  amount: { type: Number, required: true },
  amountInCents: { type: Number, required: true },
  currency: { type: String, default: 'pkr' },
  status: {
    type: String,
    enum: ['requires_confirmation', 'succeeded', 'failed', 'canceled', 'refunded'],
    default: 'requires_confirmation',
  },
  paymentMethod: { type: String, default: '' },
  failureReason: { type: String, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

TransactionSchema.index({ customer: 1, createdAt: -1 });
TransactionSchema.index({ order: 1 });

module.exports = mongoose.model('Transaction', TransactionSchema);
