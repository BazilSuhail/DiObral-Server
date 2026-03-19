const express = require('express');
const router = express.Router();
const { getPaymentIntent, verifyPayment } = require('../controllers/paymentController');
const auth = require('../middleware/authMiddleware');
const { paymentLimiter } = require('../middleware/rateLimiter');

router.use(auth);

router.post('/intent', paymentLimiter, getPaymentIntent);
router.post('/verify', paymentLimiter, verifyPayment);

module.exports = router;
