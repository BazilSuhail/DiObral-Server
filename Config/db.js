const mongoose = require('mongoose');
const Category = require('../models/Category');

const seedCategories = async () => {
  const count = await Category.countDocuments();
  if (count > 0) return;

  const rootCategories = [
    { name: 'Gym Hoodies', slug: 'gym-hoodies', isSystem: true },
    { name: 'Shorts', slug: 'shorts', isSystem: true },
    { name: 'T-Shirts', slug: 't-shirts', isSystem: true },
    { name: 'Trousers', slug: 'trousers', isSystem: true },
    { name: 'Tank Tops', slug: 'tank-tops', isSystem: true },
    { name: 'Compressions', slug: 'compressions', isSystem: true },
  ];

  await Category.insertMany(rootCategories);
  console.log('Root categories seeded');
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
    await seedCategories();
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
