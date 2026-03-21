const mongoose = require('mongoose');

const softwareSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    default: 0
  },
  isFree: {
    type: Boolean,
    default: false
  },
  fileInfo: {
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    relativePath: { type: String, required: true },
    absolutePath: { type: String },
    publicUrl: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    extension: { type: String, required: true }
  },
  downloadCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

softwareSchema.pre('save', function(next) {
  if (this.isFree) this.price = 0;
  next();
});

module.exports = mongoose.model('Software', softwareSchema);