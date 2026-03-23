const githubService = require('../services/githubService');
const multer = require('multer');

// Configure multer for memory storage (files never touch disk)
const upload = multer({
  limits: { 
    fileSize: 500 * 1024 * 1024, // 500MB max for documents/software
    fieldSize: 500 * 1024 * 1024
  },
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Log file details for debugging
    console.log(`📁 Upload request: ${file.originalname} (${file.mimetype}, ${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    
    // Accept all files for GitHub upload (GitHub handles validation)
    cb(null, true);
  }
});

// Upload handler for documents and software (admin only)
exports.uploadToGitHub = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      console.log('❌ No file in request');
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded. Please select a file to upload.' 
      });
    }

    console.log(`📤 Uploading to GitHub: ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(2)} MB)`);

    // Upload to GitHub
    const downloadUrl = await githubService.uploadFile(req.file.buffer, req.file.originalname);

    console.log(`✅ Upload successful! Download URL: ${downloadUrl}`);

    res.json({
      success: true,
      url: downloadUrl,
      message: 'File uploaded successfully to GitHub',
      filename: req.file.originalname,
      size: req.file.size,
      sizeMB: (req.file.size / 1024 / 1024).toFixed(2)
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    
    // Provide meaningful error messages
    let errorMessage = 'Upload failed. Please try again.';
    if (error.message.includes('GitHub')) {
      errorMessage = 'GitHub upload failed. Please check your GitHub token and repository.';
    } else if (error.message.includes('size')) {
      errorMessage = 'File too large. Maximum size is 500MB.';
    }
    
    res.status(500).json({ 
      success: false, 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Upload handler for screenshots (any authenticated user)
exports.uploadScreenshotToGitHub = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      console.log('❌ No screenshot in request');
      return res.status(400).json({ 
        success: false, 
        message: 'No screenshot uploaded. Please select an image file.' 
      });
    }

    // Validate file size (max 10MB for screenshots)
    if (req.file.size > 10 * 1024 * 1024) {
      console.log(`❌ Screenshot too large: ${(req.file.size / 1024 / 1024).toFixed(2)} MB`);
      return res.status(413).json({ 
        success: false, 
        message: 'Screenshot too large. Maximum size is 10MB.' 
      });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      console.log(`❌ Invalid file type: ${req.file.mimetype}`);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid file type. Please upload JPG, PNG, GIF, or WEBP image.' 
      });
    }

    console.log(`📸 Uploading screenshot: ${req.file.originalname} (${(req.file.size / 1024).toFixed(2)} KB)`);

    // Upload to GitHub
    const downloadUrl = await githubService.uploadFile(req.file.buffer, req.file.originalname);

    console.log(`✅ Screenshot uploaded! URL: ${downloadUrl}`);

    res.json({
      success: true,
      url: downloadUrl,
      message: 'Screenshot uploaded successfully',
      filename: req.file.originalname,
      size: req.file.size,
      sizeKB: (req.file.size / 1024).toFixed(2)
    });
  } catch (error) {
    console.error('❌ Screenshot upload error:', error);
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload screenshot. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Export multer middleware
exports.uploadMiddleware = upload.single('file');