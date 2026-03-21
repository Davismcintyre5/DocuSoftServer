const express = require('express');
const {
  getDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  downloadDocument
} = require('../controllers/documentController');
const { protect, admin } = require('../middleware/auth');
const { uploadDocument } = require('../config/multer');
const router = express.Router();

// Public routes
router.get('/', getDocuments);
router.get('/:id', getDocument);
router.get('/:id/download', downloadDocument);  // Make sure this is BEFORE the :id route? No, it's fine as is

// Admin routes
router.post('/', protect, admin, uploadDocument.single('file'), createDocument);
router.put('/:id', protect, admin, uploadDocument.single('file'), updateDocument);
router.delete('/:id', protect, admin, deleteDocument);

module.exports = router;