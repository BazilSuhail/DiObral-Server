const mongoose = require('mongoose');

const EmailTemplateSchema = new mongoose.Schema({
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
  },
  name: {
    type: String,
    required: true,
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
  subject: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  variables: [String],
  isDefault: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

EmailTemplateSchema.index({ store: 1, type: 1 });

module.exports = mongoose.model('EmailTemplate', EmailTemplateSchema);
