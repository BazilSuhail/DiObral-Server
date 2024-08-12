const express = require('express');
const connectDB = require('./Config/db');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

const app = express();


// Connect to database
connectDB();

app.use(cors());
app.use(express.json());

// Serve static files from the 'uploads' directory

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/products', require('./routes/productRoutes'));

app.use('/category', require('./routes/categoryRoutes'));

app.use('/subcategories', require('./routes/subcategoryRoutes'));

app.use('/fetchproducts', require('./routes/fetchProductsRoutes'));

app.use('/auth', require('./routes/authRoutes'));

app.use('/cartState', require('./routes/cartRoutes'));

app.use('/place-order', require('./routes/orderRoutes'));

app.use('/completeorder', require('./routes/adminStockRoutes'));

app.use('/product-reviews', require('./routes/productReviewRoutes'));
 
app.use('/homeproducts', require('./routes/fetch8products'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
