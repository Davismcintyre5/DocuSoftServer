const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const logger = require('../utils/logger');

// Store active jobs
const jobs = {};

// ============ PERFORM BACKUP ============
const performBackup = async (db, BackupModel, backupDir, name, type = 'auto') => {
  const collections = await db.db.listCollections().toArray();
  const collectionNames = collections.map(c => c.name).filter(n => !n.startsWith('system.'));

  const backupData = {};
  for (const col of collectionNames) {
    const docs = await db.db.collection(col).find({}).toArray();
    backupData[col] = docs;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const prefix = type === 'auto' ? `${name}_auto_backup` : `${name}_backup`;
  const fileName = `${prefix}_${timestamp}.json.gz`;
  const filePath = path.join(backupDir, fileName);

  const jsonData = JSON.stringify(backupData, null, 2);
  const compressed = zlib.gzipSync(jsonData);
  fs.writeFileSync(filePath, compressed);
  const stats = fs.statSync(filePath);

  const backup = await BackupModel.create({
    type,
    fileName,
    filePath,
    fileSize: stats.size,
    compressionType: 'gzip',
    includesMedia: false,
    collections: collectionNames,
    status: 'completed'
  });

  logger.info(`Backup created: ${fileName} (${(stats.size / 1024).toFixed(1)} KB)`);
  return backup;
};

// ============ SCHEDULE BACKUP ============
const scheduleBackup = (settings, db, BackupModel, backupDir, name) => {
  // Stop existing job
  if (jobs[name]) {
    jobs[name].stop();
    delete jobs[name];
  }

  if (!settings.enabled) {
    logger.info(`Auto-backup DISABLED for ${name}`);
    return;
  }

  const [hour, minute] = settings.time.split(':');
  let cronExpression;

  switch (settings.frequency) {
    case 'daily':
      cronExpression = `${minute} ${hour} * * *`;
      break;
    case 'weekly':
      cronExpression = `${minute} ${hour} * * 0`;
      break;
    case 'monthly':
      cronExpression = `${minute} ${hour} 1 * *`;
      break;
    default:
      cronExpression = `${minute} ${hour} * * *`;
  }

  logger.info(`Auto-backup SCHEDULED for ${name}: ${settings.frequency} at ${settings.time} (${cronExpression})`);

  const job = cron.schedule(cronExpression, async () => {
    logger.info(`Running scheduled backup for ${name}...`);
    try {
      const BackupSettingsModel = BackupModel.db.model(
        name === 'docusoft' ? 'BackupSettings' : 'HdmBackupSettings'
      );

      await performBackup(db, BackupModel, backupDir, name, 'auto');
      await BackupSettingsModel.findOneAndUpdate({}, { lastAutoBackup: new Date() });

      // Cleanup old backups
      const settings = await BackupSettingsModel.findOne();
      if (settings) {
        await cleanupOldBackups(BackupModel, backupDir, settings, name);
      }
    } catch (error) {
      logger.error(`Scheduled backup failed for ${name}: ${error.message}`);
    }
  });

  jobs[name] = job;
  return job;
};

// ============ CLEANUP OLD BACKUPS ============
const cleanupOldBackups = async (BackupModel, backupDir, settings, name) => {
  try {
    const backups = await BackupModel.find({ type: 'auto' }).sort({ createdAt: -1 });

    // Remove by max count
    if (settings.maxBackups > 0 && backups.length > settings.maxBackups) {
      const toDelete = backups.slice(settings.maxBackups);
      for (const backup of toDelete) {
        const filePath = backup.filePath || path.join(backupDir, backup.fileName);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        await backup.deleteOne();
      }
      if (toDelete.length > 0) logger.info(`Cleaned up ${toDelete.length} old backups for ${name} (max count)`);
    }

    // Remove by retention
    if (settings.retentionDays > 0) {
      const cutoff = new Date(Date.now() - settings.retentionDays * 24 * 60 * 60 * 1000);
      const oldBackups = await BackupModel.find({ createdAt: { $lt: cutoff } });
      for (const backup of oldBackups) {
        const filePath = backup.filePath || path.join(backupDir, backup.fileName);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        await backup.deleteOne();
      }
      if (oldBackups.length > 0) logger.info(`Cleaned up ${oldBackups.length} expired backups for ${name} (retention)`);
    }
  } catch (error) {
    logger.error(`Cleanup failed for ${name}: ${error.message}`);
  }
};

// ============ STOP ALL ============
const stopAll = () => {
  Object.keys(jobs).forEach(name => {
    jobs[name].stop();
    logger.info(`Stopped auto-backup for ${name}`);
  });
};

module.exports = { performBackup, scheduleBackup, cleanupOldBackups, stopAll };