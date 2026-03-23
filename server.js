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
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();

// Connect to MongoDB
connectDB();

// ============ CORS CONFIGURATION ============
const allowedOrigins = [
  'https://docusoftstore.pxxl.click',
  'https://docusoftstore-admin.pxxl.click',
  'https://docusoftserver.pxxl.click',
  'http://localhost:3000',
  'http://localhost:3001'
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || (origin && origin.endsWith('.pxxl.click'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Body parsers
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// Timeout configuration
app.use((req, res, next) => {
  req.setTimeout(600000);
  res.setTimeout(600000);
  next();
});

app.set('trust proxy', true);

// ============ STATIC FILE SERVING ============
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });
['documents', 'software', 'screenshots'].forEach(dir => {
  const dirPath = path.join(uploadsPath, dir);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
});

app.use('/uploads', express.static(uploadsPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.png')) res.setHeader('Content-Type', 'image/png');
    else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) res.setHeader('Content-Type', 'image/jpeg');
    else if (filePath.endsWith('.zip')) { res.setHeader('Content-Type', 'application/zip'); res.setHeader('Content-Disposition', 'attachment'); }
    else if (filePath.endsWith('.rar')) { res.setHeader('Content-Type', 'application/x-rar-compressed'); res.setHeader('Content-Disposition', 'attachment'); }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  }
}));

// ============ DEBUG / TEST ENDPOINTS ============
app.get('/test-github', async (req, res) => {
  try {
    const githubService = require('./services/githubService');
    const testBuffer = Buffer.from(`GitHub test - ${new Date().toISOString()}\n`);
    const url = await githubService.uploadFile(testBuffer, 'test.txt');
    res.json({ success: true, url });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/debug/check-file/:type/:filename', (req, res) => {
  const { type, filename } = req.params;
  const filePath = path.join(uploadsPath, type, filename);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    res.json({ exists: true, path: filePath, size: stats.size, url: `/uploads/${type}/${filename}` });
  } else {
    let files = [];
    const dirPath = path.join(uploadsPath, type);
    if (fs.existsSync(dirPath)) files = fs.readdirSync(dirPath);
    res.json({ exists: false, availableFiles: files.slice(0, 10) });
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
app.use('/api/upload', uploadRoutes);

// ============ HEALTH CHECK ============
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'DocuSoft Server Running',
    environment: process.env.NODE_ENV || 'production',
    server: process.env.BASE_URL,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// ============ API INFO ============
app.get('/api', (req, res) => {
  res.json({
    name: 'DocuSoft API',
    version: '1.0.0',
    status: 'running',
    environment: process.env.NODE_ENV || 'production',
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
      health: '/health',
      testGithub: '/test-github'
    }
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'DocuSoft API Server Running',
    version: '1.0.0',
    health: '/health',
    api: '/api',
    testGithub: '/test-github'
  });
});

// ============ 404 HANDLER ============
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found', path: req.path });
});

// ============ GLOBAL ERROR HANDLER ============
app.use(errorHandler);

// ============ START SERVER ============
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`📁 Uploads: ${uploadsPath}`);
  console.log(`✅ Payment routes: /api/payments`);
});