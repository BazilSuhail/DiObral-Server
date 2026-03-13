const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');

exports.submitReview = async (req, res) => {
  try {
    const { productId, rating, title, description } = req.body;

    if (!productId || !rating) {
      return res.status(400).json({ error: 'Product ID and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const existing = await Review.findOne({ product: productId, customer: req.user.id });
    if (existing) {
      return res.status(409).json({ error: 'You have already reviewed this product' });
    }

    // Check for verified purchase
    const purchased = await Order.findOne({
      customer: req.user.id,
      status: 'delivered',
      'items.product': productId,
    });

    const review = new Review({
      product: productId,
      customer: req.user.id,
      rating,
      title: title || '',
      description: description || '',
      isVerifiedPurchase: !!purchased,
    });

    await review.save();

    // Incremental rating update on Product
    const newCount = product.reviewCount + 1;
    const newAvg = ((product.rating * product.reviewCount) + rating) / newCount;

    await Product.findByIdAndUpdate(productId, {
      $set: { rating: Math.round(newAvg * 100) / 100, reviewCount: newCount },
    });

    const populated = await Review.findById(review._id)
      .populate('customer', 'fullName')
      .lean();

    res.status(201).json({ message: 'Review submitted', review: populated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;
    const sort = req.query.sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };

    const [reviews, total, stats] = await Promise.all([
      Review.find({ product: productId })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('customer', 'fullName')
        .lean(),
      Review.countDocuments({ product: productId }),
      Review.aggregate([
        { $match: { product: productId } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            count: { $sum: 1 },
            distribution: { $push: '$rating' },
          },
        },
      ]),
    ]);

    // Rating distribution { 1: n, 2: n, 3: n, 4: n, 5: n }
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (stats[0]) {
      stats[0].distribution.forEach((r) => { distribution[r]++; });
    }

    res.status(200).json({
      reviews,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      stats: {
        averageRating: stats[0] ? Math.round(stats[0].averageRating * 100) / 100 : 0,
        totalReviews: stats[0] ? stats[0].count : 0,
        distribution,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const { rating, title, description } = req.body;

    const review = await Review.findOne({ _id: req.params.id, customer: req.user.id });
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const oldRating = review.rating;

    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }
      review.rating = rating;
    }
    if (title !== undefined) review.title = title;
    if (description !== undefined) review.description = description;

    await review.save();

    // Recalculate product rating from all reviews
    const stats = await Review.aggregate([
      { $match: { product: review.product } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);

    if (stats[0]) {
      await Product.findByIdAndUpdate(review.product, {
        $set: {
          rating: Math.round(stats[0].avg * 100) / 100,
          reviewCount: stats[0].count,
        },
      });
    }

    const populated = await Review.findById(review._id)
      .populate('customer', 'fullName')
      .lean();

    res.status(200).json({ message: 'Review updated', review: populated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findOne({ _id: req.params.id, customer: req.user.id });
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const productId = review.product;
    await Review.findByIdAndDelete(review._id);

    // Recalculate product rating from remaining reviews
    const stats = await Review.aggregate([
      { $match: { product: productId } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);

    if (stats[0]) {
      await Product.findByIdAndUpdate(productId, {
        $set: {
          rating: Math.round(stats[0].avg * 100) / 100,
          reviewCount: stats[0].count,
        },
      });
    } else {
      await Product.findByIdAndUpdate(productId, {
        $set: { rating: 0, reviewCount: 0 },
      });
    }

    res.status(200).json({ message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCustomerReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ customer: req.user.id })
      .sort({ createdAt: -1 })
      .populate('product', 'name image')
      .lean();

    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
