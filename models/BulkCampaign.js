const mongoose = require('mongoose');

const BulkCampaignSchema = new mongoose.Schema({
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
  },
  template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailTemplate',
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
  recipientFilter: {
    minOrders: { type: Number, default: null },
    onlySince: { type: Date, default: null },
    excludeUnsubscribed: { type: Boolean, default: true },
  },
  totalRecipients: {
    type: Number,
    default: 0,
  },
  successCount: {
    type: Number,
    default: 0,
  },
  failCount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sending', 'completed', 'cancelled'],
    default: 'draft',
  },
  scheduledAt: {
    type: Date,
    default: null,
  },
  sentAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

BulkCampaignSchema.index({ store: 1, status: 1, sentAt: -1 });

module.exports = mongoose.model('BulkCampaign', BulkCampaignSchema);
