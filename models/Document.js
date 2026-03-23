const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  price: { type: Number, required: true, min: 0, default: 0 },
  isFree: { type: Boolean, default: false },
  fileUrl: { type: String }, // GitHub URL
  fileInfo: {
    originalName: { type: String },
    storedName: { type: String },
    relativePath: { type: String },
    absolutePath: { type: String },
    publicUrl: { type: String },
    mimeType: { type: String },
    size: { type: Number },
    extension: { type: String },
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