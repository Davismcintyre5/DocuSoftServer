const express = require('express');
const { protect } = require('../middleware/auth');
const {
  initiateManualPayment,
  uploadScreenshot,
  checkPaymentStatus,
  getUserPendingTransactions,
  initiateSTKPush,
  mpesaCallback
} = require('../controllers/paymentController');
const router = express.Router();

router.post('/mpesa-callback', mpesaCallback);

router.use(protect);
router.post('/manual', initiateManualPayment);
router.post('/screenshot/:transactionId', uploadScreenshot);
router.get('/status/:itemId', checkPaymentStatus);
router.get('/pending', getUserPendingTransactions);
router.post('/stkpush', initiateSTKPush);

module.exports = router;