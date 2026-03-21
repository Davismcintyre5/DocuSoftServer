const multer = require('multer');
const path = require('path');
const { ensureDirectoryExists, baseDir } = require('./pathManager');

// Storage for documents
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

// Storage for software (accepts .zip and .rar)
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

// Storage for screenshots
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

// File filter for documents
const documentFileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, RTF, ODT allowed.'));
  }
};

// File filter for software – includes .zip and .rar
const softwareFileFilter = (req, file, cb) => {
  const allowed = ['.zip', '.rar', '.exe', '.msi', '.dmg', '.pkg', '.appimage', '.deb'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only ZIP, RAR, EXE, MSI, DMG, PKG, AppImage, DEB allowed.'));
  }
};

// File filter for screenshots (images only)
const screenshotFileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, GIF, WEBP allowed.'));
  }
};

// Multer instances
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
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

module.exports = { uploadDocument, uploadSoftware, uploadScreenshot };