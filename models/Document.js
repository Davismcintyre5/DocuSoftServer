const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  price: { type: Number, required: true, min: 0, default: 0 },
  isFree: { type: Boolean, default: false },
  fileInfo: {
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    relativePath: { type: String, required: true },
    absolutePath: { type: String },
    publicUrl: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    extension: { type: String, required: true },
    fileType: { type: String, enum: ['document', 'archive'], default: 'document' }
  },
  downloadCount: { type: Number, default: 0 }
}, { timestamps: true });

documentSchema.pre('save', function(next) {
  if (this.isFree) this.price = 0;
  const archiveExts = ['.zip', '.rar', '.7z', '.tar', '.gz'];
  if (this.fileInfo && archiveExts.includes(this.fileInfo.extension?.toLowerCase())) {
    this.fileInfo.fileType = 'archive';
  } else if (this.fileInfo) {
    this.fileInfo.fileType = 'document';
  }
  next();
});

module.exports = mongoose.model('Document', documentSchema);