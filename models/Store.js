const mongoose = require('mongoose');

const StoreSchema = new mongoose.Schema({
  ownedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    required: true,
    unique: true,
  },
  storeName: {
    type: String,
    required: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  description: {
    type: String,
    default: '',
  },
  logo: {
    type: String,
    default: '',
  },
  banner: {
    type: String,
    default: '',
  },
  contactEmail: {
    type: String,
    default: '',
  },
  contactPhone: {
    type: String,
    default: '',
  },
  address: {
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    street: { type: String, default: '' },
    country: { type: String, default: '' },
  },
  returnPolicy: {
    type: String,
    default: '',
  },
  shippingInfo: {
    type: String,
    default: '',
  },
  socialLinks: {
    instagram: { type: String, default: '' },
    facebook: { type: String, default: '' },
    website: { type: String, default: '' },
  },
  rating: {
    type: Number,
    default: 0,
  },
  ratingCount: {
    type: Number,
    default: 0,
  },
  followerCount: {
    type: Number,
    default: 0,
  },
  productCount: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

module.exports = mongoose.model('Store', StoreSchema);
