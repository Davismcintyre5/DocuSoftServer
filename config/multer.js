const multer = require('multer');
const path = require('path');
const { ensureDirectoryExists, baseDir } = require('./pathManager');

// ============ DOCUMENT STORAGE ============
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(baseDir, 'documents');
    ensureDirectoryExists(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});

// ============ SOFTWARE STORAGE ============
const softwareStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(baseDir, 'software');
    ensureDirectoryExists(dir);
    console.log(`📁 Software upload destination: ${dir}`);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = unique + path.extname(file.originalname);
    console.log(`📄 Software filename: ${filename}`);
    cb(null, filename);
  }
});

// ============ SCREENSHOT STORAGE ============
const screenshotStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(baseDir, 'screenshots');
    ensureDirectoryExists(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});

// ============ FILE FILTERS ============
const documentFileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, RTF, ODT allowed.'));
  }
};

const softwareFileFilter = (req, file, cb) => {
  const allowed = ['.zip', '.rar', '.exe', '.msi', '.dmg', '.pkg', '.appimage', '.deb'];
  const ext = path.extname(file.originalname).toLowerCase();
  console.log(`📁 Software file: ${file.originalname}, extension: ${ext}`);
  
  if (allowed.includes(ext)) {
    console.log(`✅ Software file type accepted: ${ext}`);
    cb(null, true);
  } else {
    console.log(`❌ Software file type rejected: ${ext}`);
    cb(new Error(`Invalid file type. Allowed: ${allowed.join(', ')}`));
  }
};

const screenshotFileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, GIF, WEBP allowed.'));
  }
};

// ============ MULTER INSTANCES ============
const uploadDocument = multer({
  storage: documentStorage,
  fileFilter: documentFileFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

const uploadSoftware = multer({
  storage: softwareStorage,
  fileFilter: softwareFileFilter,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB for software
});

const uploadScreenshot = multer({
  storage: screenshotStorage,
  fileFilter: screenshotFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Error handler for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        message: `File too large. Maximum size is ${err.field === 'file' && req.originalUrl.includes('software') ? '500MB' : '100MB'}.` 
      });
    }
    return res.status(400).json({ message: err.message });
  }
  next(err);
};

module.exports = { 
  uploadDocument, 
  uploadSoftware, 
  uploadScreenshot,
  handleMulterError 
};