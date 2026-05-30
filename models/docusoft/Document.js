const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  price: { type: Number, required: true, min: 0, default: 0 },
  isFree: { type: Boolean, default: false },
  fileUrl: { type: String },               // external URL
  fileInfo: {                               // optional – only for local uploads
    originalName: String,
    storedName: String,
    relativePath: String,
    absolutePath: String,
    publicUrl: String,
    mimeType: String,
    size: Number,
    extension: String,
    // fileType removed – not needed for external URLs
  },
  downloadCount: { type: Number, default: 0 }
}, { timestamps: true });

documentSchema.pre('save', function(next) {
  if (this.isFree) this.price = 0;
  next();
});

module.exports = mongoose.model('Document', documentSchema);