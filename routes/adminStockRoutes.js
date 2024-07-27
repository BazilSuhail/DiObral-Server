const express = require('express');
const router = express.Router();
const userController = require('../controllers/adminStockController');


// Route to get all users with their orders
router.get('/users-with-orders', userController.getUsersWithOrders);
router.get('/orders/:id', userController.getOrderById);
router.get('/order-detail/:orderId', userController.getOrderDetails);

router.post('/:userId/:orderId', userController.completeOrder);


module.exports = router;
