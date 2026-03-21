const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import configs
const connectDB = require('./config/db');
const pathManager = require('./config/pathManager');
const { errorHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const documentRoutes = require('./routes/documentRoutes');
const softwareRoutes = require('./routes/softwareRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const app = express();

// Connect to MongoDB
connectDB();

// ============ CORS CONFIGURATION ============
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'https://docusoftstore.pxxl.click',
  'https://docusoftstore-admin.pxxl.click',
  'https://docusoftserver.pxxl.click'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.endsWith('.pxxl.click')) {
      callback(null, true);
    } else {
      console.warn(`⚠️ Blocked CORS request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Disposition', 'Content-Length', 'Content-Type'],
  maxAge: 86400
}));

// Handle preflight requests
app.options('*', cors());

// ============ BODY PARSERS ============
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// ============ TIMEOUT CONFIGURATION ============
app.use((req, res, next) => {
  req.setTimeout(600000); // 10 minutes
  res.setTimeout(600000); // 10 minutes
  next();
});

// Trust proxy (for Cloudflare or reverse proxies)
app.set('trust proxy', true);

// ============ STATIC FILE SERVING ============
const uploadsPath = path.join(__dirname, 'uploads');
console.log(`📁 Serving uploads from: ${uploadsPath}`);

// Create upload directories if they don't exist
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
['documents', 'software', 'screenshots'].forEach(dir => {
  const dirPath = path.join(uploadsPath, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Serve static files with proper MIME types for ZIP/RAR
app.use('/uploads', express.static(uploadsPath, {
  setHeaders: (res, filePath) => {
    // Images
    if (filePath.endsWith('.png')) res.setHeader('Content-Type', 'image/png');
    else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) res.setHeader('Content-Type', 'image/jpeg');
    else if (filePath.endsWith('.gif')) res.setHeader('Content-Type', 'image/gif');
    else if (filePath.endsWith('.webp')) res.setHeader('Content-Type', 'image/webp');
    // Documents
    else if (filePath.endsWith('.pdf')) res.setHeader('Content-Type', 'application/pdf');
    else if (filePath.endsWith('.doc')) res.setHeader('Content-Type', 'application/msword');
    else if (filePath.endsWith('.docx')) res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    else if (filePath.endsWith('.txt')) res.setHeader('Content-Type', 'text/plain');
    // Archives - ZIP and RAR support
    else if (filePath.endsWith('.zip')) {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment');
    }
    else if (filePath.endsWith('.rar')) {
      res.setHeader('Content-Type', 'application/x-rar-compressed');
      res.setHeader('Content-Disposition', 'attachment');
    }
    // Software
    else if (filePath.endsWith('.exe')) res.setHeader('Content-Type', 'application/vnd.microsoft.portable-executable');
    else if (filePath.endsWith('.msi')) res.setHeader('Content-Type', 'application/x-msi');
    else if (filePath.endsWith('.dmg')) res.setHeader('Content-Type', 'application/x-apple-diskimage');
    
    // CORS for static files
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Cache control
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  }
}));

// ============ DEBUG ENDPOINT ============
app.get('/debug/check-file/:type/:filename', (req, res) => {
  const { type, filename } = req.params;
  const filePath = path.join(uploadsPath, type, filename);
  
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    res.json({ 
      exists: true, 
      path: filePath,
      size: stats.size,
      sizeMB: (stats.size / 1024 / 1024).toFixed(2),
      modified: stats.mtime,
      url: `/uploads/${type}/${filename}`,
      fullUrl: `${process.env.BASE_URL || 'http://localhost:5000'}/uploads/${type}/${filename}`
    });
  } else {
    let files = [];
    const dirPath = path.join(uploadsPath, type);
    if (fs.existsSync(dirPath)) {
      files = fs.readdirSync(dirPath);
    }
    res.json({ 
      exists: false, 
      path: filePath,
      message: 'File not found',
      availableFiles: files.slice(0, 10)
    });
  }
});

// ============ API ROUTES ============
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/software', softwareRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);

// ============ HEALTH CHECK ============
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'DocuSoft Server Running',
    environment: process.env.NODE_ENV || 'development',
    server: process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uploadPath: uploadsPath,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ============ API INFO ============
app.get('/api', (req, res) => {
  res.json({
    name: 'DocuSoft API',
    version: '1.0.0',
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      auth: '/api/auth',
      categories: '/api/categories',
      documents: '/api/documents',
      software: '/api/software',
      payments: '/api/payments',
      orders: '/api/orders',
      admin: '/api/admin',
      settings: '/api/settings',
      health: '/health'
    }
  });
});

// ============ ROOT ROUTE ============
app.get('/', (req, res) => {
  res.json({ 
    message: 'DocuSoft API Server Running',
    version: '1.0.0',
    health: '/health',
    api: '/api'
  });
});

// ============ 404 HANDLER ============
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// ============ GLOBAL ERROR HANDLER ============
app.use(errorHandler);

// ============ START SERVER ============
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 DocuSoft Server Running');
  console.log('='.repeat(70));
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Server URL: ${process.env.BASE_URL || `http://localhost:${PORT}`}`);
  console.log(`🌐 API Endpoint: ${process.env.BASE_URL || `http://localhost:${PORT}`}/api`);
  console.log(`💚 Health Check: ${process.env.BASE_URL || `http://localhost:${PORT}`}/health`);
  console.log(`📁 Uploads Directory: ${uploadsPath}`);
  console.log(`💾 MongoDB: ${mongoose.connection.name} (${mongoose.connection.host})`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🕐 Started at: ${new Date().toISOString()}`);
  console.log('='.repeat(70));
  console.log('\n✅ Supported file types:');
  console.log('   Documents: PDF, DOC, DOCX, TXT, RTF, ODT, ZIP, RAR');
  console.log('   Software: ZIP, RAR, EXE, MSI, DMG, PKG, AppImage, DEB');
  console.log('   Screenshots: JPG, PNG, GIF, WEBP');
  console.log('='.repeat(70) + '\n');
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}, closing server...`);
  server.close(async () => {
    console.log('✅ HTTP server closed');
    try {
      await mongoose.connection.close(false);
      console.log('✅ MongoDB connection closed');
      console.log('👋 Server shutdown complete');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error closing MongoDB:', err);
      process.exit(1);
    }
  });
  
  setTimeout(() => {
    console.error('⚠️ Could not close connections in time, forcing shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;