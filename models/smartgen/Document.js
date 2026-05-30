const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'SmartGenUser', required: true },
  templateId: { type: String, required: true },
  templateName: { type: String, required: true },
  formData: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true, collection: 'documents' });

documentSchema.index({ user: 1 });

module.exports = mongoose.model('SmartGenDocument', documentSchema);