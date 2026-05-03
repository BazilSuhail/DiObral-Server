require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const Product = require('./models/Product');
  const Category = require('./models/Category');

  const cats = await Category.find().select('name slug').lean();
  console.log('CATEGORIES:', cats.map((c) => `${c.name}/${c.slug}`).join(', '));

  const range = await Product.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' }, n: { $sum: 1 } } },
  ]);
  console.log('PRICE RANGE:', JSON.stringify(range[0] || {}));

  for (const q of ['pants', 'trouser', 'shirt', 't-shirt', 'hoodie']) {
    const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const found = await Product.find({
      isActive: true,
      $or: [
        { name: { $regex: esc, $options: 'i' } },
        { description: { $regex: esc, $options: 'i' } },
        { tags: { $regex: esc, $options: 'i' } },
      ],
    }).select('name price').limit(6).lean();
    const under = found.filter((p) => p.price <= 300);
    console.log(
      `"${q}" -> ${found.length} matches (under 300: ${under.length}) ::`,
      found.slice(0, 4).map((p) => `${p.name}@${p.price}`).join(' | ') || 'NONE'
    );
  }

  const cheapest = await Product.find({ isActive: true }).sort({ price: 1 }).limit(5).select('name price').lean();
  console.log('CHEAPEST 5:', cheapest.map((p) => `${p.name}@${p.price}`).join(' | '));

  await mongoose.disconnect();
})().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
