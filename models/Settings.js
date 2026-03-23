const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  businessName: { type: String, default: 'DocuSoft Store' },
  businessPhoneNumber: { type: String, default: '0768784909' },
  whatsappNumber: { type: String, default: '0768784909' },
  enableSTKPush: { type: Boolean, default: true },
  enableManualPayment: { type: Boolean, default: true },
  paymentInstructions: { type: String, default: 'Send money to {businessNumber} via M-Pesa, then upload screenshot' },
  
  // NEW: Terms & Conditions and Privacy Policy
  termsAndConditions: {
    content: { type: String, default: 'Default Terms and Conditions. Please update these in admin settings.' },
    lastUpdated: { type: Date, default: Date.now }
  },
  privacyPolicy: {
    content: { type: String, default: 'Default Privacy Policy. Please update these in admin settings.' },
    lastUpdated: { type: Date, default: Date.now }
  },
  requireTermsAcceptance: { type: Boolean, default: true },
  
  businessHours: {
    monday: { type: String, default: '9am-5pm' },
    tuesday: { type: String, default: '9am-5pm' },
    wednesday: { type: String, default: '9am-5pm' },
    thursday: { type: String, default: '9am-5pm' },
    friday: { type: String, default: '9am-5pm' },
    saturday: { type: String, default: 'Closed' },
    sunday: { type: String, default: 'Closed' }
  },
  updatedAt: { type: Date, default: Date.now }
});

settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);