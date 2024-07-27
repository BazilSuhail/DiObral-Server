const multer = require('multer');
const path = require('path');
const Product = require('../models/product');

const fs = require('fs');


// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Middleware to handle multiple image uploads
const uploadImages = upload.fields([
  { name: 'mainImage', maxCount: 1 },
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 },
  { name: 'image3', maxCount: 1 },
  { name: 'image4', maxCount: 1 },
  { name: 'image5', maxCount: 1 },
]);

// Add product
const addProduct = async (req, res) => {
  try {
    const { name, description, category, subcategory, size, stock, price, sale } = req.body;

    // Extract file paths (use filenames only)
    const mainImage = req.files['mainImage'] ? req.files['mainImage'][0].filename : '';
    const otherImages = [
      req.files['image1'] ? req.files['image1'][0].filename : '',
      req.files['image2'] ? req.files['image2'][0].filename : '',
      req.files['image3'] ? req.files['image3'][0].filename : '',
      req.files['image4'] ? req.files['image4'][0].filename : '',
      req.files['image5'] ? req.files['image5'][0].filename : ''
    ];

    const newProduct = new Product({
      name,
      description,
      category,
      subcategory,
      size: size.split(',').map(s => s.trim()), // Convert to array
      stock,
      price,
      sale,
      image: mainImage,
      otherImages,
    });

    await newProduct.save();
    res.status(201).json({ message: 'Product added successfully', product: newProduct });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all products
const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get products by category
const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.query;
    const products = await Product.find({ category });
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a product by ID
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a product by ID
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, subcategory, size, stock, price, sale } = req.body;

    // Find the product
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Path to the uploads directory
    const imagePath = path.join(__dirname, '..', 'uploads');

    // Function to delete a file if it exists
    const deleteFileIfExists = (filePath) => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    };

    // Update fields
    product.name = name || product.name;
    product.description = description || product.description;
    product.category = category || product.category;
    product.subcategory = subcategory || product.subcategory;
    product.size = size ? size.split(',').map(s => s.trim()) : product.size; // Convert to array if provided
    product.stock = stock || product.stock;
    product.price = price || product.price;
    product.sale = sale || product.sale;

    // Update images if provided and delete old ones
    if (req.files['mainImage']) {
      // Delete old main image if it exists
      if (product.image) {
        const oldMainImagePath = path.join(imagePath, product.image);
        deleteFileIfExists(oldMainImagePath);
      }
      // Update to new main image
      product.image = req.files['mainImage'][0].filename;
    }

    // Handle other images
    const oldOtherImages = [...product.otherImages]; // Copy old images for deletion

    for (let i = 1; i <= 5; i++) {
      const imageKey = `image${i}`;
      if (req.files[imageKey]) {
        // Delete old image if it exists
        if (product.otherImages[i - 1]) {
          const oldImagePath = path.join(imagePath, product.otherImages[i - 1]);
          deleteFileIfExists(oldImagePath);
        }
        // Update to new image
        product.otherImages[i - 1] = req.files[imageKey][0].filename;
      }
    }

    // Remove any images that are no longer in the product
    oldOtherImages.forEach((image, index) => {
      if (!product.otherImages.includes(image)) {
        const oldImagePath = path.join(imagePath, image);
        deleteFileIfExists(oldImagePath);
      }
    });

    await product.save();
    res.status(200).json({ message: 'Product updated successfully', product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the product first to get image paths
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Path to the uploads directory
    const uploadsDir = path.join(__dirname, '..', 'uploads');

    // Function to delete a file if it exists
    const deleteFileIfExists = (filePath) => {
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error(`Error deleting file ${filePath}: ${err.message}`);
        }
      }
    };

    // Delete main image
    if (product.image) {
      const mainImagePath = path.join(uploadsDir, product.image);
      deleteFileIfExists(mainImagePath);
    }

    // Delete other images
    product.otherImages.forEach((image) => {
      if (image) {
        const imageFilePath = path.join(uploadsDir, image);
        deleteFileIfExists(imageFilePath);
      }
    });

    // After deleting the images, delete the product document
    await Product.findByIdAndDelete(id);

    res.status(200).json({ message: 'Product and associated images deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error); // Log error details for debugging
    res.status(500).json({ error: error.message });
  }
};


module.exports = { addProduct, getAllProducts, getProductsByCategory, getProductById, updateProduct, deleteProduct, uploadImages };
