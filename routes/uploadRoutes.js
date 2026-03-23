const express = require('express');
const { protect, admin } = require('../middleware/auth');
const { 
  uploadToGitHub, 
  uploadScreenshotToGitHub, 
  uploadMiddleware 
} = require('../controllers/uploadController');

const router = express.Router();

// Admin-only route for documents & software uploads
router.post('/github', protect, admin, uploadMiddleware, uploadToGitHub);

// Any authenticated user route for screenshot uploads
router.post('/screenshot', protect, uploadMiddleware, uploadScreenshotToGitHub);

module.exports = router;