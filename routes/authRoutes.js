const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { register, login, getProfile, updateProfile, upgradeToRetailer } = require('../controllers/authController');
const auth = require('../middleware/authMiddleware');
const { authLimiter, registerLimiter } = require('../middleware/rateLimiter');

const registerValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fullName').trim().isLength({ min: 1 }).withMessage('Full name is required'),
  body('role').optional().custom((value) => {
    const roles = Array.isArray(value) ? value : [value];
    const valid = ['customer', 'retailer'];
    for (const r of roles) {
      if (!valid.includes(r)) return false;
    }
    return true;
  }).withMessage('Role(s) must be one or more of: customer, retailer'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

router.post('/register', registerLimiter, registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);
router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfile);
router.post('/upgrade-to-retailer', auth, upgradeToRetailer);

module.exports = router;
