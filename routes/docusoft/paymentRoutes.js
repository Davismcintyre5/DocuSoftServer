const router = require('express').Router();
const { protect } = require('../../middleware/docusoft/auth');
const {
  initiateSTKPush,
  initiateManualPayment,
  uploadScreenshot,
  submitConfirmationMessage,
  checkPaymentStatus,
  getUserPendingTransactions,
  mpesaCallback,
  debugTransaction
} = require('../../controllers/docusoft/paymentController');
const { screenshotUploadMiddleware } = require('../../controllers/docusoft/uploadController');

// M-Pesa callback (no auth)
router.post('/mpesa/callback', mpesaCallback);

// Protected
router.use(protect);
router.post('/stk-push', initiateSTKPush);
router.post('/manual', initiateManualPayment);
router.post('/screenshot/:transactionId', screenshotUploadMiddleware, uploadScreenshot);
router.post('/confirm/:transactionId', submitConfirmationMessage);
router.get('/status/:itemId', checkPaymentStatus);
router.get('/pending', getUserPendingTransactions);
router.get('/debug/:id', debugTransaction);

module.exports = router;