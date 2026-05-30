const router = require('express').Router();
const { protect, admin } = require('../../middleware/docusoft/auth');
const { uploadMiddleware, screenshotUploadMiddleware, uploadToGitHub, uploadScreenshotToGitHub } = require('../../controllers/docusoft/uploadController');

router.post('/github', protect, admin, uploadMiddleware, uploadToGitHub);
router.post('/screenshot', protect, screenshotUploadMiddleware, uploadScreenshotToGitHub);

module.exports = router;