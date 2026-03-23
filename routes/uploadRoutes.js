const express = require('express');
const { protect, admin } = require('../middleware/auth');
const { 
  uploadToGitHub, 
  uploadScreenshotToGitHub, 
  uploadMiddleware 
} = require('../controllers/uploadController');

const router = express.Router();

// Admin-only – for documents & software
router.post('/github', protect, admin, uploadMiddleware, uploadToGitHub);

// Any authenticated user – for screenshots
router.post('/screenshot', protect, uploadMiddleware, uploadScreenshotToGitHub);

module.exports = router;