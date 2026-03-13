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
        
    console.log("error");
        return res.status(400).json({ errors: errors.array() });
    }
    await login(req, res);
});

router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfile);

module.exports = router;
