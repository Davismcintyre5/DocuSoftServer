const githubService = require('../services/githubService');
const multer = require('multer');

// Multer configuration – in-memory buffer for upload to GitHub
const upload = multer({
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  storage: multer.memoryStorage()
});

// For admin uploads (documents, software)
exports.uploadToGitHub = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log(`📤 Uploading to GitHub: ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(2)} MB)`);

    const downloadUrl = await githubService.uploadFile(req.file.buffer, req.file.originalname);

    console.log(`✅ Upload complete: ${downloadUrl}`);

    res.json({
      success: true,
      url: downloadUrl,
      message: 'File uploaded successfully'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      message: error.message || 'Upload failed'
    });
  }
};

// For screenshot uploads (any authenticated user)
exports.uploadScreenshotToGitHub = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Validate file size (max 10MB for screenshots)
    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(413).json({ message: 'Screenshot too large. Max 10MB.' });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ 
        message: 'Invalid file type. Please upload JPG, PNG, GIF, or WEBP image.' 
      });
    }

    console.log(`📸 Uploading screenshot: ${req.file.originalname} (${(req.file.size / 1024).toFixed(2)} KB)`);

    const downloadUrl = await githubService.uploadFile(req.file.buffer, req.file.originalname);

    console.log(`✅ Screenshot uploaded to GitHub: ${downloadUrl}`);

    res.json({
      success: true,
      url: downloadUrl,
      message: 'Screenshot uploaded successfully'
    });
  } catch (error) {
    console.error('Screenshot upload error:', error);
    res.status(500).json({
      message: error.message || 'Failed to upload screenshot'
    });
  }
};

// Middleware for the routes
exports.uploadMiddleware = upload.single('file');