const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

const app = express();

connectDB();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/auth', require('./routes/authRoutes'));
app.use('/retailer/store', require('./routes/storeRoutes'));
app.use('/retailer/products', require('./routes/productRoutes'));
app.use('/categories', require('./routes/categoryRoutes'));
app.use('/retailer/orders', require('./routes/orderRoutes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
