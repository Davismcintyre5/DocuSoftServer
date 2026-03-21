const path = require('path');
const fs = require('fs');

// Base directory for uploads: inside server folder
const baseDir = process.env.UPLOADS_ROOT || path.join(__dirname, '../uploads');

function getAbsolutePath(relativePath) {
  if (!relativePath) return null;
  return path.join(baseDir, relativePath);
}

function getPublicUrl(relativePath) {
  return `${process.env.BASE_URL}/uploads/${relativePath}`;
}

function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

module.exports = { baseDir, getAbsolutePath, getPublicUrl, ensureDirectoryExists };