const mongoose = require('mongoose');

const softwareSchema = new mongoose.Schema({
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
    extension: { type: String }
  },
  downloadCount: { type: Number, default: 0 }
}, { timestamps: true });

softwareSchema.pre('save', function(next) {
  if (this.isFree) this.price = 0;
  next();
});

module.exports = mongoose.model('Software', softwareSchema);