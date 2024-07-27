const express = require('express');
const router = express.Router();
const ProductReview = require('../models/ProductReview'); // Your ProductReview model

// Route to handle review submission
router.post('/reviews', async (req, res) => {
    try {
        const { productId, review } = req.body;
        // Check if productId and review are provided
        if (!productId || !review) {
            return res.status(400).json({ message: 'Product ID and review are required' });
        }

        // Validate the review structure
        if (!review.name || !review.email || !review.phone || !review.rating || !review.description) {
            return res.status(400).json({ message: 'Review must include name, email, phone, rating, and description' });
        }

        // Find the existing review document for the product
        let productReview = await ProductReview.findOne({ productId });

        if (productReview) {
            // If exists, push the new review into the reviews array
            productReview.reviews.push(review);
            await productReview.save();
        } else {
            // If not exists, create a new review document
            productReview = new ProductReview({
                productId,
                reviews: [review]
            });
            await productReview.save();
        }

        res.status(201).json({ message: 'Review submitted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to submit review', error: error.message });
    }
});

// Route to handle review fetching with pagination
router.get('/reviews/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const { page = 1, limit = 4 } = req.query;
        const skip = (page - 1) * limit;

        const productReviews = await ProductReview.findOne({ productId }).select('reviews').exec();

        if (!productReviews) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const reviews = productReviews.reviews.slice(skip, skip + parseInt(limit));
        res.json({
            reviews,
            hasMore: (skip + limit) < productReviews.reviews.length
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
module.exports = router;
