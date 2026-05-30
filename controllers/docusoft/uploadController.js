const githubService = require('../../services/docusoft/githubService');
const multer = require('multer');
const busboy = require('busboy');

// Configure multer for memory storage (documents/software)
const upload = multer({
  limits: { 
    fileSize: 500 * 1024 * 1024,
    fieldSize: 500 * 1024 * 1024
  },
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    console.log(`📁 Upload request: ${file.originalname} (${file.mimetype})`);
    cb(null, true);
  }
});

// Upload handler for documents and software (admin only)
exports.uploadToGitHub = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    console.log(`📤 Uploading to GitHub: ${req.file.originalname}`);
    const downloadUrl = await githubService.uploadFile(req.file.buffer, req.file.originalname);
    console.log(`✅ Upload successful!`);

    res.json({
      success: true,
      url: downloadUrl,
      message: 'File uploaded successfully',
      filename: req.file.originalname,
      size: req.file.size,
      sizeMB: (req.file.size / 1024 / 1024).toFixed(2)
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    let errorMessage = 'Upload failed';
    if (error.message.includes('GitHub')) errorMessage = 'GitHub upload failed';
    else if (error.message.includes('size')) errorMessage = 'File too large. Max 500MB';
    res.status(500).json({ success: false, message: errorMessage });
  }
};

// Upload handler for screenshots
exports.uploadScreenshotToGitHub = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No screenshot uploaded' });
    }

    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(413).json({ success: false, message: 'Screenshot too large. Max 10MB.' });
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ success: false, message: 'Invalid file type. JPG, PNG, GIF, or WEBP only.' });
    }

    console.log(`📸 Uploading screenshot: ${req.file.originalname}`);
    const downloadUrl = await githubService.uploadFile(req.file.buffer, req.file.originalname);
    console.log(`✅ Screenshot uploaded!`);

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
    res.status(500).json({ success: false, message: 'Failed to upload screenshot' });
  }
};

// Multer middleware for single file (field: 'file')
exports.uploadMiddleware = upload.single('file');

// Middleware for screenshot upload — accepts any field name
exports.screenshotUploadMiddleware = (req, res, next) => {
  const bb = busboy({ headers: req.headers, limits: { fileSize: 10 * 1024 * 1024 } });

  bb.on('file', (fieldname, file, info) => {
    const chunks = [];
    file.on('data', (chunk) => chunks.push(chunk));
    file.on('end', () => {
      req.file = {
        buffer: Buffer.concat(chunks),
        originalname: info.filename,
        mimetype: info.mimeType,
        size: Buffer.concat(chunks).length
      };
    });
  });

  bb.on('finish', () => next());
  bb.on('error', (err) => res.status(400).json({ message: err.message }));

  req.pipe(bb);
};