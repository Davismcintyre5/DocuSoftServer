const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  path: { type: String, required: true },
  category: { type: String, default: 'General' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true, collection: 'hdm_photos' });

module.exports = mongoose.model('HdmPhoto', photoSchema);