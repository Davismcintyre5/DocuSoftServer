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

// ============ CORS CONFIGURATION - FIXED ============
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'https://docusoftstore.pxxl.click',
  'https://docusoftstore-admin.pxxl.click',
  'https://docusoftserver.pxxl.click'
];

// CORS middleware - MUST BE FIRST
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Allow all .pxxl.click domains and localhost
  if (origin && (origin.includes('localhost') || origin.endsWith('.pxxl.click'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  } else if (process.env.NODE_ENV === 'development') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  }
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  
  next();
});

// Body parsers with increased limits
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// ============ STATIC FILE SERVING ============
const uploadsPath = path.join(__dirname, 'uploads');
console.log(`📁 Serving uploads from: ${uploadsPath}`);

// Create directories if they don't exist
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
['documents', 'software', 'screenshots'].forEach(dir => {
  const dirPath = path.join(uploadsPath, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

app.use('/uploads', express.static(uploadsPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.png')) res.setHeader('Content-Type', 'image/png');
    else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) res.setHeader('Content-Type', 'image/jpeg');
    else if (filePath.endsWith('.zip')) res.setHeader('Content-Type', 'application/zip');
    else if (filePath.endsWith('.rar')) res.setHeader('Content-Type', 'application/x-rar-compressed');
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

// ============ ROUTES ============
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/software', softwareRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);

// ============ DEBUG ENDPOINT ============
app.get('/debug/routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach(middleware => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router' && middleware.handle) {
      middleware.handle.stack.forEach(handler => {
        if (handler.route) {
          routes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  res.json({ 
    message: 'Registered routes',
    softwareRoutes: routes.filter(r => r.path && r.path.includes('software'))
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'DocuSoft Server Running',
    timestamp: new Date().toISOString(),
    uploadPath: uploadsPath
  });
});

// API info
app.get('/api', (req, res) => {
  res.json({
    name: 'DocuSoft API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth',
      categories: '/api/categories',
      documents: '/api/documents',
      software: '/api/software',
      payments: '/api/payments',
      orders: '/api/orders',
      admin: '/api/admin',
      settings: '/api/settings'
    }
  });
});

// Root route
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
  res.status(404).json({ 
    message: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 DocuSoft Server Running');
  console.log('='.repeat(60));
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API URL: ${process.env.BASE_URL || `http://localhost:${PORT}`}/api`);
  console.log(`💚 Health: ${process.env.BASE_URL || `http://localhost:${PORT}`}/health`);
  console.log(`📁 Uploads: ${uploadsPath}`);
  console.log('='.repeat(60) + '\n');
});

module.exports = app;