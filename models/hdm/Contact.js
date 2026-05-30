const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false }
}, { timestamps: true, collection: 'hdm_contacts' });

contactSchema.index({ isRead: 1 });
contactSchema.index({ createdAt: -1 });

module.exports = mongoose.model('HdmContact', contactSchema);