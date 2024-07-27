const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.post('/orders/:userId', orderController.saveOrder);
router.get('/orders/:userId', orderController.getOrders);

module.exports = router;
