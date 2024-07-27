const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateProfile } = require('../controllers/authProfileController');
const auth = require('../middleware/authMiddleware');

// Validation middleware example (if used)
const { check, validationResult } = require('express-validator');

router.post('/register', [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').not().isEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    await register(req, res);
});

router.post('/login', [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').not().isEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    await login(req, res);
});

router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfile);

router.post('/add-to-cart', auth, async (req, res) => {
    try {
        const { product, quantity } = req.body;
        const user = await User.findById(req.user.id);
        const cartItem = user.cart.find(item => item.product.toString() === product._id);

        if (cartItem) {
            cartItem.quantity += quantity;
        } else {
            user.cart.push({ product: product._id, quantity });
        }

        await user.save();
        res.status(200).json(user.cart);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add to cart' });
    }
});

module.exports = router;
