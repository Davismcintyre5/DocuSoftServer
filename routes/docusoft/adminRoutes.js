const router = require('express').Router();
const { protect, admin } = require('../../middleware/docusoft/auth');
const {
  getStats, getUsers, updateUserRole, toggleUserStatus,
  getPendingPayments, approvePayment, rejectPayment,
  getSettings, updateSettings
} = require('../../controllers/docusoft/adminController');
const {
  listBackups, getSettings: getBackupSettings, updateSettings: updateBackupSettings,
  createBackup, triggerAutoBackup, deleteBackup, restoreBackup, downloadBackup
} = require('../../controllers/docusoft/backupController');

router.use(protect, admin);

router.get('/stats', getStats);
router.get('/users', getUsers);
router.put('/users/:id/role', updateUserRole);
router.put('/users/:id/status', toggleUserStatus);
router.get('/payments/pending', getPendingPayments);
router.put('/payments/:id/approve', approvePayment);
router.put('/payments/:id/reject', rejectPayment);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// Backups — settings MUST be before :id
router.get('/backups/settings', getBackupSettings);
router.put('/backups/settings', updateBackupSettings);
router.post('/backups/auto', triggerAutoBackup);
router.get('/backups', listBackups);
router.post('/backups', createBackup);
router.delete('/backups/:id', deleteBackup);
router.post('/backups/:id/restore', restoreBackup);
router.get('/backups/:id/download', downloadBackup);

module.exports = router;