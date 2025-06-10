const express = require('express');
const router = express.Router();
const ProductReview = require('../models/productReview'); // Your ProductReview model
const Product = require('../models/product'); // Your ProductReview model


// Route to handle review submission
// router.post('/reviews', async (req, res) => {
//     try {
//         const { productId, review } = req.body;
//         // Check if productId and review are provided
//         if (!productId || !review) {
//             return res.status(400).json({ message: 'Product ID and review are required' });
//         }
//         console.log(review);

//         // Validate the review structure
//         if (!review.name || !review.email || !review.phone || !review.rating || !review.description) {
//             return res.status(400).json({ message: 'Review must include name, email, phone, rating, and description' });
//         }

//         // Find the existing review document for the product
//         let productReview = await ProductReview.findOne({ productId });

//         if (productReview) {
//             // If exists, push the new review into the reviews array
//             productReview.reviews.push(review);
//             //console.log(productReview);
//             await productReview.save();
//         } else {
//             // If not exists, create a new review document
//             productReview = new ProductReview({
//                 productId,
//                 reviews: [review]
//             });
//             await productReview.save();
//         }

//         res.status(201).json({ message: 'Review submitted successfully' });
//     } catch (error) {
//         res.status(500).json({ message: 'Failed to submit review', error: error.message });
//     }
// });

router.post('/reviews', async (req, res) => {
    try {
        const { productId, review } = req.body;

        // Basic presence check
        if (!productId || !review) {
            return res.status(400).json({ message: 'Product ID and review are required' });
        }

        const { name, email, phone, rating, description } = review;

        // Validate all fields are present
        if (!name || !email || !phone || rating === undefined || !description) {
            return res.status(400).json({ message: 'Review must include name, email, phone, rating, and description' });
        }

        // Validate rating is a number between 1 and 5
        if (typeof rating !== 'number' || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be a number between 1 and 5' });
        }

        // Add review to ProductReview collection
        let productReview = await ProductReview.findOne({ productId });

        if (productReview) {
            productReview.reviews.push(review);
            await productReview.save();
        } else {
            productReview = new ProductReview({
                productId,
                reviews: [review]
            });
            await productReview.save();
        }

        // Fetch Product
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Initialize rating and reviews if missing
        const existingReviewsCount = typeof product.reviews === 'number' ? product.reviews : 0;
        const existingRating = typeof product.rating === 'number' ? product.rating : 0;

        const currentTotalRating = existingRating * existingReviewsCount;
        const newReviewsCount = existingReviewsCount + 1;
        const newAverageRating = (currentTotalRating + rating) / newReviewsCount;

        product.reviews = newReviewsCount;
        product.rating = newAverageRating;

        await product.save();

        res.status(201).json({ message: 'Review submitted and product rating updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to submit review', error: error.message });
    }
});



// Route to handle review fetching with pagination
router.get('/reviews/:productId', async (req, res) => {
    try {
        const productId = req.params.productId;
        const reviews = await ProductReview.findOne({ productId: productId });
        if (!reviews) {
            return res.status(404).json({ message: 'Reviews not found for this product.' });
        }
        res.status(200).json(reviews);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});


router.get('/reviews/average/:productId', async (req, res) => {
    try {
        const productId = req.params.productId;
        const productReview = await ProductReview.findOne({ productId });

        if (!productReview) {
            return res.status(404).json({ message: 'Reviews not found for this product.' });
        }

        // Calculate the average rating
        const totalReviews = productReview.reviews.length;
        const sumRatings = productReview.reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = (totalReviews > 0) ? (sumRatings / totalReviews).toFixed(2) : 0; 
        res.status(200).json({ averageRating: parseFloat(averageRating) });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

router.get('/reviews/count/:productId', async (req, res) => {
    try {
        const productId = req.params.productId;
        const productReview = await ProductReview.findOne({ productId });

        if (!productReview) {
            return res.status(404).json({ message: 'Reviews not found for this product.' });
        }

        const reviewCount = productReview.reviews.length;

        res.status(200).json({ reviewCount });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

module.exports = router;