// models/Subcategory.js
const mongoose = require('mongoose');

const subcategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true }
});

module.exports = mongoose.model('Subcategory', subcategorySchema);
