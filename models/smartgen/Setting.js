const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'SmartGenUser', required: true, unique: true },
  theme: { type: String, enum: ['light', 'dark'], default: 'light' },
  defaultCategory: { type: String, default: '' }
}, { timestamps: true, collection: 'settings' });

module.exports = mongoose.model('SmartGenSetting', settingSchema);