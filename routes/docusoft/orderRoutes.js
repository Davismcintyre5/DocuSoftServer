const router = require('express').Router();
const { protect, admin } = require('../../middleware/docusoft/auth');
const { getMyOrders, getAllOrders } = require('../../controllers/docusoft/orderController');

router.use(protect);
router.get('/my', getMyOrders);
router.get('/all', admin, getAllOrders);

module.exports = router;