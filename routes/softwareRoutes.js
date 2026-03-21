const express = require('express');
const {
  getSoftware,
  getSoftwareItem,
  createSoftware,
  updateSoftware,
  deleteSoftware,
  downloadSoftware
} = require('../controllers/softwareController');
const { protect, admin } = require('../middleware/auth');
const { uploadSoftware } = require('../config/multer');
const router = express.Router();

// Public routes
router.get('/', getSoftware);
router.get('/:id', getSoftwareItem);
router.get('/:id/download', downloadSoftware);  // Make sure this route exists

// Admin routes
router.post('/', protect, admin, uploadSoftware.single('file'), createSoftware);
router.put('/:id', protect, admin, uploadSoftware.single('file'), updateSoftware);
router.delete('/:id', protect, admin, deleteSoftware);

module.exports = router;