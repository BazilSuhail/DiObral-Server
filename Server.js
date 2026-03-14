const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

const app = express();

connectDB();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Auth
app.use('/auth', require('./routes/authRoutes'));

// Public browsing
app.use('/api', require('./routes/publicRoutes'));

// Retailer
app.use('/retailer/store', require('./routes/storeRoutes'));
app.use('/retailer/products', require('./routes/productRoutes'));
app.use('/retailer/orders', require('./routes/orderRoutes'));

// Categories (public)
app.use('/categories', require('./routes/categoryRoutes'));

// Customer
app.use('/cart', require('./routes/cartRoutes'));
app.use('/checkout', require('./routes/checkoutRoutes'));
app.use('/orders', require('./routes/customerOrderRoutes'));

// Reviews
app.use('/reviews', require('./routes/reviewRoutes'));
app.use('/store-reviews', require('./routes/storeReviewRoutes'));

// Wishlist & Follow
app.use('/wishlist', require('./routes/wishlistRoutes'));

// Coupons (retailer management + public validation)
app.use('/coupons', require('./routes/couponRoutes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
