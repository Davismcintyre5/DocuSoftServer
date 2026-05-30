const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  ai: {
    enabled: { type: Boolean, default: false },
    baseUrl: { type: String, default: 'https://hdmai-server.onrender.com/api/v1' },
    apiKey: { type: String, default: '', select: false },
    greeting: { type: String, default: "Hi! I'm HDM AI. Ask me about our services, apps, or projects." },
    widgetColor: { type: String, default: '#0a5c8e' },
    widgetPosition: { type: String, enum: ['left', 'right'], default: 'right' }
  }
}, { timestamps: true, collection: 'hdmsettings' });

settingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) settings = await this.create({});
  return settings;
};

module.exports = mongoose.model('HdmSettings', settingsSchema);