const StoreReview = require('../models/StoreReview');
const Store = require('../models/Store');
const Order = require('../models/Order');

exports.submitStoreReview = async (req, res) => {
  try {
    const { storeId, rating, comment } = req.body;

    if (!storeId || !rating) {
      return res.status(400).json({ error: 'Store ID and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const existing = await StoreReview.findOne({ store: storeId, customer: req.user.id });
    if (existing) {
      return res.status(409).json({ error: 'You have already reviewed this store' });
    }

    // Check if customer has ordered from this store
    const hasOrdered = await Order.findOne({
      customer: req.user.id,
      store: storeId,
      status: 'delivered',
    });

    if (!hasOrdered) {
      return res.status(403).json({ error: 'You can only review stores you have purchased from' });
    }

    const review = new StoreReview({
      store: storeId,
      customer: req.user.id,
      rating,
      comment: comment || '',
    });

    await review.save();

    // Incremental store rating update
    const newCount = store.ratingCount + 1;
    const newAvg = ((store.rating * store.ratingCount) + rating) / newCount;

    await Store.findByIdAndUpdate(storeId, {
      $set: { rating: Math.round(newAvg * 100) / 100, ratingCount: newCount },
    });

    const populated = await StoreReview.findById(review._id)
      .populate('customer', 'fullName')
      .lean();

    res.status(201).json({ message: 'Store review submitted', review: populated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getStoreReviews = async (req, res) => {
  try {
    const { storeId } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const [reviews, total, stats] = await Promise.all([
      StoreReview.find({ store: storeId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('customer', 'fullName')
        .lean(),
      StoreReview.countDocuments({ store: storeId }),
      StoreReview.aggregate([
        { $match: { store: storeId } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]),
    ]);

    res.status(200).json({
      reviews,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      stats: {
        averageRating: stats[0] ? Math.round(stats[0].avg * 100) / 100 : 0,
        totalReviews: stats[0] ? stats[0].count : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteStoreReview = async (req, res) => {
  try {
    const review = await StoreReview.findOne({ _id: req.params.id, customer: req.user.id });
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const storeId = review.store;
    await StoreReview.findByIdAndDelete(review._id);

    const stats = await StoreReview.aggregate([
      { $match: { store: storeId } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);

    if (stats[0]) {
      await Store.findByIdAndUpdate(storeId, {
        $set: {
          rating: Math.round(stats[0].avg * 100) / 100,
          ratingCount: stats[0].count,
        },
      });
    } else {
      await Store.findByIdAndUpdate(storeId, {
        $set: { rating: 0, ratingCount: 0 },
      });
    }

    res.status(200).json({ message: 'Store review deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
