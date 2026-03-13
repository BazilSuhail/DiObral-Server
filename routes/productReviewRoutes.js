const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Review = require('../models/Review');
const Product = require('../models/Product');

// Submit a review
router.post('/reviews', async (req, res) => {
    try {
        const { productId, review, customerId } = req.body;

        if (!productId || !review) {
            return res.status(400).json({ message: 'Product ID and review are required' });
        }

        const { rating, description } = review;
        const name = review.name || '';
        const email = review.email || '';

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be a number between 1 and 5' });
        }

        const newReview = new Review({
            product: productId,
            customer: customerId || null,
            rating,
            title: review.title || '',
            description: description || '',
            isVerifiedPurchase: false,
        });

        await newReview.save();

        // Update product rating aggregate
        const stats = await Review.aggregate([
            { $match: { product: new mongoose.Types.ObjectId(productId) } },
            { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
        ]);

        if (stats.length > 0) {
            await Product.findByIdAndUpdate(productId, {
                rating: Math.round(stats[0].avgRating * 100) / 100,
                reviewCount: stats[0].count,
            });
        }

        res.status(201).json({ message: 'Review submitted successfully', review: newReview });
    } catch (error) {
        res.status(500).json({ message: 'Failed to submit review', error: error.message });
    }
});

// Fetch reviews for a product (with pagination)
router.get('/reviews/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const reviews = await Review.find({ product: productId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Review.countDocuments({ product: productId });

        res.status(200).json({ reviews, total, page, totalPages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

// Get average rating
router.get('/reviews/average/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const stats = await Review.aggregate([
            { $match: { product: new mongoose.Types.ObjectId(productId) } },
            { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
        ]);

        if (stats.length === 0) {
            return res.status(200).json({ averageRating: 0, reviewCount: 0 });
        }

        res.status(200).json({
            averageRating: Math.round(stats[0].avgRating * 100) / 100,
            reviewCount: stats[0].count,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

// Get review count
router.get('/reviews/count/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const count = await Review.countDocuments({ product: productId });
        res.status(200).json({ reviewCount: count });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

// Utility: update product images
router.get('/product-images', async (req, res) => {
    try {
        const products = await Product.find({}).limit(20).exec();

        if (!products || products.length === 0) {
            return res.status(404).json({ message: 'No products found.' });
        }

        const updatePromises = products.map((product, index) => {
            const newImageName = `${index + 1}.webp`;
            return Product.updateOne(
                { _id: product._id },
                { $set: { image: newImageName } }
            );
        });

        await Promise.all(updatePromises);

        res.status(200).json({
            message: 'Successfully updated images for first 20 products',
            updatedCount: products.length,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;