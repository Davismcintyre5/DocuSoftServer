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
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
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
  const allowed = [
    '.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt',
    '.zip', '.rar'               // <-- ADDED ZIP AND RAR
  ];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: ${allowed.join(', ')}`));
  }
};

const softwareFileFilter = (req, file, cb) => {
  const allowed = ['.zip', '.rar', '.exe', '.msi', '.dmg', '.pkg', '.appimage', '.deb'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
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
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB for documents
});

const uploadSoftware = multer({
  storage: softwareStorage,
  fileFilter: softwareFileFilter,
  limits: { fileSize: 500 * 1024 * 1024 }
});

const uploadScreenshot = multer({
  storage: screenshotStorage,
  fileFilter: screenshotFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'File too large. Maximum size is 500MB.' });
    }
    return res.status(400).json({ message: err.message });
  }
  next(err);
};

module.exports = { uploadDocument, uploadSoftware, uploadScreenshot, handleMulterError };