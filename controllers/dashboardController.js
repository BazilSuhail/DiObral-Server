const Order = require('../models/Order');
const Product = require('../models/Product');
const Bundle = require('../models/Bundle');
const Review = require('../models/Review');
const Profile = require('../models/Profile');

function monthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key) {
  const [year, month] = key.split('-').map(Number);
  const d = new Date(year, month - 1, 1);
  return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

exports.getDashboard = async (req, res) => {
  try {
    const profile = await Profile.findById(req.user.id);
    if (!profile || !profile.store) {
      return res.status(403).json({ error: 'No store found' });
    }

    const storeId = profile.store;
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);

    const [
      productCount,
      bundleCount,
      orderStats,
      revenue30d,
      revenue7d,
      revenueTotal,
      recentOrders,
      topProducts,
      lowStock,
      reviewStats,
      ordersTrend,
    ] = await Promise.all([
      Product.countDocuments({ store: storeId }),
      Bundle.countDocuments({ store: storeId }),
      Order.aggregate([
        { $match: { store: storeId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { store: storeId, status: 'delivered', createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { store: storeId, status: 'delivered', createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { store: storeId, status: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.find({ store: storeId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('customer', 'fullName')
        .lean(),
      Order.aggregate([
        { $match: { store: storeId, status: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            name: { $first: '$items.name' },
            image: { $first: '$items.image' },
            quantitySold: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.discountedPrice', '$items.quantity'] } },
          },
        },
        { $sort: { quantitySold: -1 } },
        { $limit: 5 },
      ]),
      Product.find({ store: storeId, stock: { $lte: 5 } })
        .select('name stock image price')
        .sort({ stock: 1 })
        .lean(),
      Review.aggregate([
        {
          $lookup: {
            from: 'products',
            localField: 'product',
            foreignField: '_id',
            as: 'product',
          },
        },
        { $unwind: '$product' },
        { $match: { 'product.store': storeId } },
        { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { store: storeId, createdAt: { $gte: twelveMonthsAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            orders: { $sum: 1 },
            revenue: { $sum: '$total' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const statusMap = { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
    orderStats.forEach((s) => { statusMap[s._id] = s.count; });

    const monthlyTrend = ordersTrend
      .map((d) => ({
        month: monthLabel(d._id),
        key: d._id,
        orders: d.orders,
        revenue: d.revenue,
      }))
      .sort((a, b) => a.key.localeCompare(b.key));

    res.status(200).json({
      products: {
        total: productCount,
        bundles: bundleCount,
        lowStock: lowStock.length,
        lowStockItems: lowStock,
      },
      orders: {
        ...statusMap,
        total: Object.values(statusMap).reduce((a, b) => a + b, 0),
        recent: recentOrders,
      },
      revenue: {
        total30d: revenue30d[0]?.total || 0,
        orders30d: revenue30d[0]?.count || 0,
        total7d: revenue7d[0]?.total || 0,
        orders7d: revenue7d[0]?.count || 0,
        allTime: revenueTotal[0]?.total || 0,
      },
      topProducts,
      ratings: {
        average: reviewStats[0]?.avgRating
          ? Math.round(reviewStats[0].avgRating * 100) / 100
          : 0,
        total: reviewStats[0]?.count || 0,
      },
      trends: {
        monthly: monthlyTrend,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
