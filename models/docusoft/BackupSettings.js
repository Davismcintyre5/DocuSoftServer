const mongoose = require('mongoose');

const backupSettingsSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  frequency: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' },
  time: { type: String, default: '02:00' },
  retentionDays: { type: Number, default: 30 },
  maxBackups: { type: Number, default: 10 },
  lastAutoBackup: { type: Date, default: null },
  nextAutoBackup: { type: Date, default: null }
}, { timestamps: true });

backupSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('BackupSettings', backupSettingsSchema);