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

// ============ CORS CONFIGURATION - PRODUCTION ============
const allowedOrigins = [
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

app.options('*', cors());

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

// Static file serving
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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/software', softwareRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'DocuSoft Server Running',
    environment: 'production',
    server: process.env.BASE_URL,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// API info
app.get('/api', (req, res) => {
  res.json({
    name: 'DocuSoft API',
    version: '1.0.0',
    status: 'running',
    environment: 'production',
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
      health: '/health'
    }
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'DocuSoft API Server Running',
    version: '1.0.0',
    health: '/health',
    api: '/api'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found', path: req.path });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Environment: ${process.env.NODE_ENV}`);
  console.log(`📁 Uploads: ${uploadsPath}`);
  console.log(`✅ GitHub Integration: ${process.env.GITHUB_TOKEN ? 'Enabled' : 'Disabled'}`);
});

module.exports = app;