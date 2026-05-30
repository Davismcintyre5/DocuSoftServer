const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const Backup = require('../../models/docusoft/Backup');
const BackupSettings = require('../../models/docusoft/BackupSettings');
const { performBackup, scheduleBackup, cleanupOldBackups } = require('../../services/backupService');
const logger = require('../../utils/logger');

const BACKUP_DIR = path.join(__dirname, '../../backups/docusoft');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

const NAME = 'docusoft';

// ============ INIT ============
const initAutoBackup = async () => {
  try {
    const settings = await BackupSettings.getSettings();
    scheduleBackup(settings, mongoose.connection, Backup, BACKUP_DIR, NAME);
    logger.info(`DocuSoft auto-backup: ${settings.enabled ? 'ENABLED' : 'DISABLED'}`);
  } catch (error) {
    logger.warn(`DocuSoft auto-backup init failed: ${error.message}`);
  }
};

// ============ ENDPOINTS ============
exports.listBackups = async (req, res) => {
  try {
    const backups = await Backup.find().sort({ createdAt: -1 });
    res.json({ success: true, data: backups });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSettings = async (req, res) => {
  try {
    const settings = await BackupSettings.getSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    let settings = await BackupSettings.findOne();
    if (!settings) settings = new BackupSettings();

    const allowedFields = ['enabled', 'frequency', 'time', 'retentionDays', 'maxBackups'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) settings[field] = req.body[field];
    });

    await settings.save();

    // Restart scheduler with new settings
    scheduleBackup(settings, mongoose.connection, Backup, BACKUP_DIR, NAME);

    logger.info(`DocuSoft backup settings updated: ${JSON.stringify(settings.toObject())}`);
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createBackup = async (req, res) => {
  try {
    const backup = await performBackup(mongoose.connection, Backup, BACKUP_DIR, NAME, 'manual');
    res.status(201).json({ success: true, data: backup });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.triggerAutoBackup = async (req, res) => {
  try {
    const backup = await performBackup(mongoose.connection, Backup, BACKUP_DIR, NAME, 'auto');
    await BackupSettings.findOneAndUpdate({}, { lastAutoBackup: new Date() });
    const settings = await BackupSettings.getSettings();
    await cleanupOldBackups(Backup, BACKUP_DIR, settings, NAME);
    res.json({ success: true, data: backup, message: 'Auto-backup completed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteBackup = async (req, res) => {
  try {
    const backup = await Backup.findById(req.params.id);
    if (!backup) return res.status(404).json({ success: false, message: 'Backup not found' });

    const filePath = backup.filePath || path.join(BACKUP_DIR, backup.fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await backup.deleteOne();
    res.json({ success: true, message: 'Backup deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.restoreBackup = async (req, res) => {
  try {
    const backup = await Backup.findById(req.params.id);
    if (!backup) return res.status(404).json({ success: false, message: 'Backup not found' });

    const filePath = backup.filePath || path.join(BACKUP_DIR, backup.fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Backup file not found' });
    }

    const rawData = fs.readFileSync(filePath);
    const jsonData = zlib.gunzipSync(rawData).toString();
    const backupData = JSON.parse(jsonData);
    const db = mongoose.connection.db;

    for (const [collectionName, docs] of Object.entries(backupData)) {
      if (docs.length === 0) continue;
      await db.collection(collectionName).deleteMany({});
      await db.collection(collectionName).insertMany(docs);
    }

    res.json({ success: true, message: 'Backup restored successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.downloadBackup = async (req, res) => {
  try {
    const backup = await Backup.findById(req.params.id);
    if (!backup) return res.status(404).json({ success: false, message: 'Backup not found' });

    const filePath = backup.filePath || path.join(BACKUP_DIR, backup.fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Backup file not found' });
    }

    res.download(filePath, backup.fileName);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.initAutoBackup = initAutoBackup;