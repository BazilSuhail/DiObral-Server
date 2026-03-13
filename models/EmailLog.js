const mongoose = require('mongoose');

const EmailLogSchema = new mongoose.Schema({
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
  },
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BulkCampaign',
    default: null,
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null,
  },
  type: {
    type: String,
    enum: [
      'order_confirmation',
      'order_shipped',
      'order_delivered',
      'bulk_marketing',
      'newsletter',
      'abandoned_cart',
    ],
    required: true,
  },
  recipientEmail: {
    type: String,
    required: true,
  },
  recipientProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    default: null,
  },
  subject: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['sent', 'failed', 'bounced', 'opened'],
    default: 'sent',
  },
  openedAt: {
    type: Date,
    default: null,
  },
  errorMessage: {
    type: String,
    default: '',
  },
  sentAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

EmailLogSchema.index({ store: 1, type: 1, sentAt: -1 });
EmailLogSchema.index({ recipientEmail: 1, store: 1 });
EmailLogSchema.index({ campaign: 1 });
EmailLogSchema.index({ order: 1 });

module.exports = mongoose.model('EmailLog', EmailLogSchema);
