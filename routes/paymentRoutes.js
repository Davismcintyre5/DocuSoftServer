const express = require('express');
const { protect } = require('../middleware/auth');
const {
  initiateManualPayment, uploadScreenshot, checkPaymentStatus, getUserPendingTransactions
} = require('../controllers/paymentController');
const { uploadScreenshot: uploadScreenshotMiddleware } = require('../config/multer');
const router = express.Router();

router.use(protect);
router.post('/manual', initiateManualPayment);
router.post('/screenshot/:transactionId', uploadScreenshotMiddleware.single('screenshot'), uploadScreenshot);
router.get('/status/:itemId', checkPaymentStatus);
router.get('/pending', getUserPendingTransactions);

module.exports = router;