const mongoose = require('mongoose');

const backupSchema = new mongoose.Schema({
  type: { type: String, enum: ['manual', 'full', 'incremental', 'auto'], default: 'manual' },
  fileName: { type: String, required: true },
  fileUrl: { type: String, default: '' },
  filePath: { type: String, default: '' },
  fileSize: { type: Number, default: 0 },
  compressionType: { type: String, enum: ['gzip', 'zlib', 'none'], default: 'gzip' },
  includesMedia: { type: Boolean, default: false },
  collections: [String],
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  errorMessage: { type: String, default: '' }
}, { timestamps: true, collection: 'hdmbackups' });

module.exports = mongoose.model('HdmBackup', backupSchema);