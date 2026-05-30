const router = require('express').Router();
const { protect, admin } = require('../../middleware/docusoft/auth');
const upload = require('../../controllers/docusoft/uploadController').uploadMiddleware;
const {
  getSoftware,
  getSoftwareItem,
  createSoftware,
  updateSoftware,
  deleteSoftware,
  downloadSoftware
} = require('../../controllers/docusoft/softwareController');

router.get('/', getSoftware);
router.get('/:id', getSoftwareItem);
router.post('/', protect, admin, upload, createSoftware);
router.put('/:id', protect, admin, upload, updateSoftware);
router.delete('/:id', protect, admin, deleteSoftware);
router.get('/:id/download', downloadSoftware);

module.exports = router;