const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  price: { type: Number, required: true, min: 0, default: 0 },
  isFree: { type: Boolean, default: false },
  // External URL (GitHub, etc.) – primary source
  fileUrl: { type: String },
  // Local file info – optional, only for uploaded files
  fileInfo: {
    originalName: String,
    storedName: String,
    relativePath: String,
    absolutePath: String,
    publicUrl: String,
    mimeType: String,
    size: Number,
    extension: String,
    fileType: { type: String, enum: ['document', 'archive'], default: 'document' }
  },
  downloadCount: { type: Number, default: 0 }
}, { timestamps: true });

documentSchema.pre('save', function(next) {
  if (this.isFree) this.price = 0;
  // Auto-detect fileType if fileInfo exists
  if (this.fileInfo && this.fileInfo.extension) {
    const archiveExts = ['.zip', '.rar', '.7z', '.tar', '.gz'];
    this.fileInfo.fileType = archiveExts.includes(this.fileInfo.extension.toLowerCase()) ? 'archive' : 'document';
  }
  next();
});

module.exports = mongoose.model('Document', documentSchema);