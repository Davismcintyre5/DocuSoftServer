const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  icon: { type: String, default: '⚡' },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, { timestamps: true, collection: 'hdm_services' });

serviceSchema.index({ isActive: 1, order: 1 });

module.exports = mongoose.model('HdmService', serviceSchema);