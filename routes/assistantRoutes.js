const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { handleMessage } = require('../controllers/assistantController');
const { heavyLimiter } = require('../middleware/rateLimiter');

// Public endpoint, but attach req.user when a valid token is present so the
// controller can guard cart / checkout actions for guests.
const attachUserIfPresent = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: decoded.id, role: decoded.role || 'customer' };
    } catch {
      // invalid/expired token -> act as guest, never reject the request
    }
  }
  next();
};

router.post('/', heavyLimiter, attachUserIfPresent, handleMessage);

module.exports = router;
