const express = require('express');
const { protect, admin } = require('../middleware/auth');
const { getMyOrders, getAllOrders } = require('../controllers/orderController');
const router = express.Router();

router.get('/my-orders', protect, getMyOrders);
router.get('/all', protect, admin, getAllOrders);

module.exports = router;