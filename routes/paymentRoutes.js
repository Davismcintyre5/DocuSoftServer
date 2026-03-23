const express = require('express');
const { protect } = require('../middleware/auth');
const {
  initiateManualPayment,
  uploadScreenshot,
  submitConfirmationMessage,
  checkPaymentStatus,
  getUserPendingTransactions,
  initiateSTKPush,
  mpesaCallback
} = require('../controllers/paymentController');
const { uploadScreenshot: uploadScreenshotMiddleware } = require('../config/multer');
const router = express.Router();

// Public callback (no auth)
router.post('/mpesa-callback', mpesaCallback);

// All following routes require authentication
router.use(protect);

// Payment initiation
router.post('/manual', initiateManualPayment);
router.post('/stkpush', initiateSTKPush);

// Payment confirmation methods
router.post('/screenshot/:transactionId', uploadScreenshotMiddleware.single('screenshot'), uploadScreenshot);
router.post('/confirmation/:transactionId', submitConfirmationMessage);

// Status queries
router.get('/status/:itemId', checkPaymentStatus);
router.get('/pending', getUserPendingTransactions);

module.exports = router;