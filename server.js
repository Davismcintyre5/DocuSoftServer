require('dotenv').config();

const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);

process.noDeprecation = true;
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');

// ============ CONFIG ============
const connectDB = require('./config/docusoft/db');
const { connectSmartGenDB } = require('./config/smartgen/db');
const { connectHdmDB } = require('./config/hdm/db');
const { errorHandler } = require('./middleware/global/errorHandler');
const { stopAll } = require('./services/backupService');

const app = express();

// ============ CORS ============
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Allow if origin is in the list
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  
  if (req.method === 'OPTIONS') {
    // If origin not allowed, still respond 204 but without CORS headers
    return res.sendStatus(204);
  }
  
  next();
});

// ============ BODY PARSERS ============
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// ============ REQUEST LOGGER ============
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.req(req.method, req.originalUrl, res.statusCode);
  });
  next();
});

// ============ TIMEOUT ============
app.use((req, res, next) => {
  req.setTimeout(600000);
  res.setTimeout(600000);
  next();
});

app.set('trust proxy', true);

// ============ ENSURE DIRECTORIES EXIST ============
const dirs = [
  'uploads',
  'uploads/docusoft/documents',
  'uploads/docusoft/software',
  'uploads/docusoft/screenshots',
  'uploads/smartgen',
  'uploads/hdm/logos',
  'uploads/hdm/photos',
  'uploads/hdm/apps',
  'uploads/hdm/projects',
  'backups/docusoft',
  'backups/hdm'
];

dirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logger.info(`Created directory: ${dir}`);
  }
});

// ============ STATIC FILES ============
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.png')) res.setHeader('Content-Type', 'image/png');
    else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) res.setHeader('Content-Type', 'image/jpeg');
    else if (filePath.endsWith('.webp')) res.setHeader('Content-Type', 'image/webp');
    else if (filePath.endsWith('.gif')) res.setHeader('Content-Type', 'image/gif');
    else if (filePath.endsWith('.zip')) {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment');
    } else if (filePath.endsWith('.rar')) {
      res.setHeader('Content-Type', 'application/x-rar-compressed');
      res.setHeader('Content-Disposition', 'attachment');
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  }
}));

// ============ APPS ============
app.use('/api', require('./apps/docusoft'));
app.use('/smartgen', require('./apps/smartgen'));
app.use('/hdm', require('./apps/hdm'));

// ============ API INFO ============
app.get('/api', (req, res) => {
  res.json({
    name: 'DocuSoft API',
    version: '2.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth',
      categories: '/api/categories',
      documents: '/api/documents',
      software: '/api/software',
      payments: '/api/payments',
      orders: '/api/orders',
      admin: '/api/admin',
      settings: '/api/settings',
      upload: '/api/upload',
      ai: '/api/ai'
    }
  });
});

// ============ HEALTH CHECK ============
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server Running',
    environment: process.env.NODE_ENV || 'production',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Server Running',
    version: '2.0.0',
    health: '/health',
    modules: {
      docusoft: '/api',
      smartgen: '/smartgen',
      hdm: '/hdm'
    }
  });
});

// ============ 404 ============
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found', path: req.path });
});

// ============ ERROR HANDLER ============
app.use(errorHandler);

// ============ START ============
const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    logger.info('Connecting to databases...');
    await connectDB();
    await connectSmartGenDB();
    await connectHdmDB();
    logger.info('All databases connected');

    // Init auto-backups
    try {
      const { initAutoBackup: initDocuSoftBackup } = require('./controllers/docusoft/backupController');
      await initDocuSoftBackup();
    } catch (e) {
      logger.warn(`DocuSoft auto-backup: ${e.message}`);
    }

    try {
      const { initAutoBackup: initHdmBackup } = require('./controllers/hdm/admin/backupController');
      await initHdmBackup();
    } catch (e) {
      logger.warn(`HDM auto-backup: ${e.message}`);
    }

    logger.info('Server initialization complete');
  } catch (error) {
    logger.error(`Database connection failed: ${error.message}`);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    console.log(`   DocuSoft  → /api`);
    console.log(`   SmartGen  → /smartgen`);
    console.log(`   HDM       → /hdm`);
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    stopAll();
    server.close(() => {
      logger.info('Server closed');
      mongoose.disconnect().then(() => {
        logger.info('MongoDB disconnected');
        process.exit(0);
      });
    });
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

start();

module.exports = app;