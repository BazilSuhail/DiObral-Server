const mongoose = require('mongoose');

const StoreSubscriberSchema = new mongoose.Schema({
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  isSubscribed: {
    type: Boolean,
    default: true,
  },
  subscribedAt: {
    type: Date,
    default: Date.now,
  },
  unsubscribedAt: {
    type: Date,
    default: null,
  },
  source: {
    type: String,
    enum: ['at_checkout', 'store_page', 'manual_import'],
    default: 'at_checkout',
  },
}, { timestamps: true });

StoreSubscriberSchema.index({ store: 1, isSubscribed: 1 });
StoreSubscriberSchema.index({ customer: 1, store: 1 }, { unique: true });

module.exports = mongoose.model('StoreSubscriber', StoreSubscriberSchema);
