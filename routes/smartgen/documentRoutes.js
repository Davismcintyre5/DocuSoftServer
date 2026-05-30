const router = require('express').Router();
const { protect } = require('../../middleware/smartgen/auth');
const {
  getDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument
} = require('../../controllers/smartgen/documentController');

router.use(protect);
router.get('/', getDocuments);
router.get('/:id', getDocument);
router.post('/', createDocument);
router.put('/:id', updateDocument);
router.delete('/:id', deleteDocument);

module.exports = router;