const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: [String],
    default: ['customer'],
  },
  fullName: {
    type: String,
    default: '',
  },
  bio: {
    type: String,
    default: '',
  },
  contact: {
    type: String,
    default: '',
  },
  address: {
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    street: { type: String, default: '' },
    country: { type: String, default: '' },
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    default: null,
  },
  favProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  }],
  favStores: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
  }],
  favProductCount: {
    type: Number,
    default: 0,
  },
  favStoreCount: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

ProfileSchema.index({ store: 1 }, { sparse: true });

module.exports = mongoose.model('Profile', ProfileSchema);
