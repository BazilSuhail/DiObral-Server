const Order = require('../models/Order');
const Product = require('../models/Product');
const Bundle = require('../models/Bundle');
const Review = require('../models/Review');
const Profile = require('../models/Profile');

exports.getDashboard = async (req, res) => {
  try {
    const profile = await Profile.findById(req.user.id);
    if (!profile || !profile.store) {
      return res.status(403).json({ error: 'No store found' });
    }

    const storeId = profile.store;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

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
      // Total products
      Product.countDocuments({ store: storeId }),

      // Total bundles
      Bundle.countDocuments({ store: storeId }),

      // Order counts by status
      Order.aggregate([
        { $match: { store: storeId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Revenue last 30 days (delivered)
      Order.aggregate([
        { $match: { store: storeId, status: 'delivered', createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),

      // Revenue last 7 days
      Order.aggregate([
        { $match: { store: storeId, status: 'delivered', createdAt: { $gte: sevenDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),

      // All-time revenue
      Order.aggregate([
        { $match: { store: storeId, status: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),

      // Recent orders (last 10)
      Order.find({ store: storeId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('customer', 'fullName')
        .lean(),

      // Top 5 selling products by total quantity sold
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

      // Low stock products (stock <= 5)
      Product.find({ store: storeId, stock: { $lte: 5 } })
        .select('name stock image price')
        .sort({ stock: 1 })
        .lean(),

      // Average rating
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

      // Daily orders trend (last 7 days)
      Order.aggregate([
        { $match: { store: storeId, createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            orders: { $sum: 1 },
            revenue: { $sum: '$total' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Build status map
    const statusMap = { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
    orderStats.forEach((s) => { statusMap[s._id] = s.count; });

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
        daily: ordersTrend.map((d) => ({
          date: d._id,
          orders: d.orders,
          revenue: d.revenue,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
