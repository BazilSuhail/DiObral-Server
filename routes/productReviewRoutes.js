const express = require('express');
const router = express.Router();
const ProductReview = require('../models/productReview'); // Your ProductReview model
const Product = require('../models/product'); // Your ProductReview model


const menProducts = [
  {
    name: "Men's PowerFlex Tee",
    description: "High-performance moisture-wicking t-shirt designed for intense workouts. Features breathable fabric with four-way stretch for maximum mobility. Anti-odor technology keeps you fresh. Perfect for gym sessions or running. Available in multiple colors. Machine washable. 100% polyester. UPF 50+ sun protection. Lightweight and comfortable for all-day wear."
  },
  {
    name: "Adidas EliteTrain Shorts",
    description: "Premium training shorts with built-in compression liner for support. Quick-dry fabric with mesh panels for ventilation. Secure zip pocket for essentials. Elastic waistband with adjustable drawstring. Ideal for cross-training, basketball, or casual wear. Reinforced stitching for durability. Moisture management keeps you dry. Available in sizes S-XXL. Imported."
  },
  {
    name: "Endura UrbanFlex Suit",
    description: "Stylish joggers with athletic performance features. Stretch-woven fabric provides freedom of movement. Tapered fit with ankle zippers. Water-resistant finish for outdoor use. Multiple pockets including secure phone pouch. Perfect for streetwear or gym-to-street style. Machine wash cold. 85% polyester, 15% spandex. Mid-rise waist with adjustable drawcord."
  },
  {
    name: "Nike ProFormance Tank",
    description: "Muscle-fit tank top for serious athletes. Ultra-lightweight fabric with superior breathability. Raglan sleeves allow full range of motion. Contrast color trim for style. Flatlock seams prevent chafing. Great for weightlifting or high-intensity training. Tagless design for comfort. Quick-drying technology. Imported. Available in dark heather and black."
  },
  {
    name: "AeroRun Jacket",
    description: "Wind-resistant running jacket with reflective details. Lightweight and packable for easy storage. Full-zip front with stand-up collar. Thumbholes at cuffs for added coverage. Breathable mesh lining. Two zippered hand pockets. Perfect for cool morning runs or casual wear. Machine washable. 100% nylon. Fitted athletic cut for men."
  },
  {
    name: "FlexCore Hoodie",
    description: "Performance hoodie with stretch fabric for active wear. Kangaroo pocket with media port. Adjustable drawstring hood. Ribbed cuffs and hem for secure fit. Brushed interior for warmth. Great for post-workout recovery or casual streetwear. 80% cotton, 20% polyester. Medium weight for year-round comfort. Imported. Available in multiple colors."
  },
  {
    name: "CompressFit Flex Tights",
    description: "High-compression training tights for muscle support. Graduated compression improves circulation. Gusseted crotch for mobility. Non-slip waistband stays in place. Reflective logos for visibility. Perfect for running, cycling, or gym workouts. 88% nylon, 12% spandex. Moisture-wicking and quick-drying. Available in black and navy. Sizes S-XXL."
  },
  {
    name: "Xtreme Men's Weighted Vest",
    description: "Versatile athletic vest for training and streetwear. Cushioned insole for all-day comfort. Flexible rubber outsole with grip pattern. Breathable mesh upper. Padded collar and tongue. Lightweight design for active wear. Available in multiple colorways. Imported. True to size. Great for gym, casual, or light trail use."
  },
  {
    name: "SteadyStep Men ThermoBase Layer",
    description: "Long-sleeve thermal base layer for cold weather training. Silky-soft fabric wicks moisture away from skin. Flatlock seams prevent irritation. Thumbholes at cuffs. Odor-resistant treatment. Perfect under jackets or alone. 92% polyester, 8% spandex. Machine wash cold. Available in black, grey, and navy. Fitted athletic cut."
  },
  {
    name: "SwiftTrack Men's Running Jacket",
    description: "Training Running with enhanced grip and wrist support. Palm-less design for bar contact. Breathable mesh back. Adjustable wrist strap. Padded palms protect against calluses. Great for weightlifting, crossfit, or calisthenics. Machine washable. Available in S/M/L sizes. Black with contrast stitching. Imported. Durable construction."
  },
  {
    name: "Adidas Running Shorts",
    description: "BPA-free hydration abosrption with sport cap. 24oz capacity with measurement markings. Leak-proof when closed. Easy-grip texture. Insulated sleeve keeps drinks cool. Perfect for gym, running, or sports. Dishwasher safe. Multiple color options. Durable construction. Carabiner loop for attachment. Sweat-proof surface. Made in USA."
  },
  {
    name: "ActiveCore Men's Trouser",
    description: "Stretchy yoga pants for men with gusseted crotch. Four-way stretch fabric moves with you. Wide waistband for comfort. Side pockets for essentials. Breathable and moisture-wicking. Perfect for yoga, pilates, or lounging. 85% polyester, 15% spandex. Machine wash cold. Available in black and charcoal. Imported. Sizes S-XXL."
  },
  {
    name: "Trainer's Flex Pants",
    description: "Premium leather weightlifting belt for serious training. 6-inch back support with contoured fit. Double-prong buckle for security. Reinforced stitching for durability. Padded interior for comfort. Available in multiple sizes. Great for powerlifting, strongman, or crossfit. Made in USA. Break-in period required. Handcrafted quality."
  },
  {
    name: "AeroSwift Singlet",
    description: "Competition singlet for wrestling or weightlifting. Breathable mesh panels for ventilation. Stretch fabric allows full range of motion. Anti-microbial treatment. Reinforced stitching at stress points. Available in team colors. Machine wash cold. 100% polyester. Lightweight and comfortable. Imported. Sizes S-XXL."
  },
  {
    name: "TrailBlaze Backpack",
    description: "Durable gym backpack with multiple compartments. Padded laptop sleeve fits 15 devices. Ventilated shoe compartment. Water bottle pockets. Padded shoulder straps. Reflective accents. Perfect for gym, travel, or school. 600D polyester. Available in black, blue, and grey. Imported. 25L capacity. Rain-resistant coating."
  },
  {
    name: "SoftBlen Men's Impact Suit",
    description: "Post-workout recovery sandals with arch support. Contoured footbed relieves pressure. Lightweight EVA foam construction. Massage nubs stimulate circulation. Water-resistant and odor-resistant. Great for after gym, pool, or travel. Available in S/M/L sizes. Multiple color options. Imported. Easy to clean. Slip-resistant soles."
  },
  {
    name: "BoxFit Training Gloves",
    description: "Professional boxing gloves for training. Premium synthetic leather construction. Multi-layer foam padding. Mesh palm for breathability. Secure wrist strap. Great for bag work, mitts, or sparring. Available in 12oz, 14oz, 16oz. Red or black color. Imported. Approved for competition use. Hand wash recommended."
  },
  {
    name: "JumpRope Pro Trousers",
    description: "Weighted speed jump rope for fitness. Ball bearing system for smooth rotation. Adjustable cable length. Memory foam handles. Great for cardio, boxing, or crossfit. Includes carrying pouch. 9' max length. 1.5mm steel cable. Available in multiple colors. Imported. Improves coordination and endurance."
  },
  {
    name: "ResistBand Set",
    description: "5-piece resistance band set for full-body training. Includes door anchor and handles. Latex-free material. Various resistance levels (light to heavy). Great for strength training, rehab, or travel. Includes workout guide. Maximum stretch 60 inches. Storage bag included. Imported. Color-coded for easy identification."
  },
  {
    name: "ArmorX Men's Impact Suit",
    description: "Microfiber impact suit with anti-bacterial treatment. Super absorbent and quick-drying. Non-slip corner for equipment. Compact size fits in any bag. Perfect for gym, yoga, or sports. Machine washable. Available in multiple colors. 24 x 48 size. Imported. Lightweight and durable. Odor-resistant technology."
  }
];


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


// Route to update product images to webp format for first 20 documents
router.get('/product-images', async (req, res) => {
    try {
        // Get all products from the collection
        const products = await Product.find({}).limit(20).exec();
        
        if (!products || products.length === 0) {
            return res.status(404).json({ message: 'No products found.' });
        }

        // Update each product's image attribute
        const updatePromises = products.map((product, index) => {
            const newImageName = `${index + 1}.webp`; // 1.webp, 2.webp, etc.
            return Product.updateOne(
                { _id: product._id },
                { $set: { image: newImageName } }
            );
        });

        // Wait for all updates to complete
        await Promise.all(updatePromises);

        res.status(200).json({ 
            message: 'Successfully updated images for first 20 products',
            updatedCount: products.length
        });

    } catch (error) {
        console.error('Error updating product images:', error);
        res.status(500).json({ 
            message: 'Server error while updating product images',
            error: error.message 
        });
    }
});

// Endpoint to update all products with new names and descriptions
router.get('/update-all-products', async (req, res) => {
  try {
    // Get all products from the database
    const products = await Product.find({});

    // Check if any products exist
    if (products.length === 0) {
      return res.status(404).json({ message: 'No products found in database.' });
    }

    // Check if the number of products matches the mock data
    if (products.length !== menProducts.length) {
      return res.status(400).json({ 
        message: `Mismatch: Database has ${products.length} products, but mock data has ${menProducts.length} entries.` 
      });
    }

    // Update products one by one
    let updatedCount = 0;
    const updatePromises = products.map(async (product, index) => {
      const mockProduct = menProducts[index];
      const result = await Product.updateOne(
        { _id: product._id },
        {
          $set: {
            name: mockProduct.name,
            description: mockProduct.description
          }
        }
      );
      if (result.modifiedCount > 0) updatedCount += 1;
    });

    // Execute all updates
    await Promise.all(updatePromises);

    res.status(200).json({
      message: 'Successfully updated product names and descriptions',
      updatedCount: updatedCount
    });

  } catch (error) {
    console.error('Error updating products:', error);
    res.status(500).json({
      message: 'Server error while updating products',
      error: error.message
    });
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