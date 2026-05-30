const router = require('express').Router();
const { protect, admin } = require('../../middleware/docusoft/auth');
const upload = require('../../controllers/docusoft/uploadController').uploadMiddleware;
const {
  getDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  downloadDocument
} = require('../../controllers/docusoft/documentController');

router.get('/', getDocuments);
router.get('/:id', getDocument);
router.post('/', protect, admin, upload, createDocument);
router.put('/:id', protect, admin, upload, updateDocument);
router.delete('/:id', protect, admin, deleteDocument);
router.get('/:id/download', downloadDocument);

module.exports = router;