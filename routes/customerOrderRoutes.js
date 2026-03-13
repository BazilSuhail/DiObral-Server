const express = require('express');
const router = express.Router();
const { getOrders, getOrder, trackOrder } = require('../controllers/customerOrderController');
const auth = require('../middleware/authMiddleware');

router.use(auth);

router.get('/', getOrders);
router.get('/:id', getOrder);
router.get('/:id/track', trackOrder);

module.exports = router;
