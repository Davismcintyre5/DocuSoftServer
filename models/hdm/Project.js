const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  image: { type: String, default: '' },
  link: { type: String, default: '' },
  technologies: [String],
  featured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, { timestamps: true, collection: 'hdm_projects' });

projectSchema.index({ isActive: 1, featured: 1 });
projectSchema.index({ isActive: 1, order: 1 });

module.exports = mongoose.model('HdmProject', projectSchema);