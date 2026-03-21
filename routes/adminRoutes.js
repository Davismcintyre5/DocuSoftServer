const express = require('express');
const { protect, admin } = require('../middleware/auth');
const {
  getStats,
  getUsers,
  updateUserRole,
  toggleUserStatus,
  getPendingPayments,
  approvePayment,
  rejectPayment,
  getSettings,
  updateSettings
} = require('../controllers/adminController');
const router = express.Router();

// All routes require authentication and admin role
router.use(protect, admin);

// Dashboard stats
router.get('/stats', getStats);

// User management
router.get('/users', getUsers);
router.put('/users/:id/role', updateUserRole);
router.put('/users/:id/status', toggleUserStatus);

// Payment management
router.get('/pending-payments', getPendingPayments);
router.post('/approve-payment/:id', approvePayment);
router.post('/reject-payment/:id', rejectPayment);

// Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

module.exports = router;