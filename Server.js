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

app.use('/api/products', require('./routes/productRoutes'));

app.use('/api/category', require('./routes/categoryRoutes'));

app.use('/api/subcategories', require('./routes/subcategoryRoutes'));

app.use('/api/fetchproducts', require('./routes/fetchProductsRoutes'));

app.use('/api/auth', require('./routes/authRoutes'));

app.use('/api/cartState', require('./routes/cartRoutes'));

app.use('/api/place-order', require('./routes/orderRoutes'));

app.use('/api/completeorder', require('./routes/adminStockRoutes'));

app.use('/api', require('./routes/productReviewRoutes'));
 

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
