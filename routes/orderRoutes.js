const express = require('express');
const router = express.Router();
const { getOrders, getOrder, updateOrderStatus, getOrderStats } = require('../controllers/orderController');
const auth = require('../middleware/authMiddleware');

router.use(auth);

router.get('/stats', getOrderStats);
router.get('/', getOrders);
router.get('/:id', getOrder);
router.patch('/:id/status', updateOrderStatus);

module.exports = router;
