const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateProfile, upgradeToRetailer } = require('../controllers/authController');
const auth = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfile);
router.post('/upgrade-to-retailer', auth, upgradeToRetailer);

module.exports = router;
