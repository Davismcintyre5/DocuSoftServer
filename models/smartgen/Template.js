const mongoose = require('mongoose');

const fieldSchema = new mongoose.Schema({
  name: { type: String, required: true },
  label: { type: String, required: true },
  type: { type: String, enum: ['text', 'textarea', 'number', 'date', 'select', 'checkbox', 'email', 'phone'], default: 'text' },
  required: { type: Boolean, default: false },
  options: [String],
  placeholder: String
}, { _id: false });

const templateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  icon: { type: String, default: '📄' },
  fields: [fieldSchema],
  isPublic: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SmartGenUser' }
}, { timestamps: true, collection: 'templates' });

templateSchema.index({ category: 1, isPublic: 1 });

module.exports = mongoose.model('SmartGenTemplate', templateSchema);