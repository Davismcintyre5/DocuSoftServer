const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isActive: { type: Boolean, default: true },
  // NEW: Terms acceptance tracking
  acceptedTerms: { type: Boolean, default: false },
  acceptedPrivacy: { type: Boolean, default: false },
  termsAcceptedAt: { type: Date },
  privacyAcceptedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);