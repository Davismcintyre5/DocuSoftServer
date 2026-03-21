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

// ============ CONFIGURATION ============
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Allowed origins for CORS (both local and production)
const allowedOrigins = [
  // Local development
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  
  // Production domains
  'https://docusoftstore.pxxl.click',
  'https://docusoftstore-admin.pxxl.click',
  'https://docusoftserver.pxxl.click',
  
  // Allow any subdomain of pxxl.click (for flexibility)
  /\.pxxl\.click$/
];

// ============ CORS CONFIGURATION ============
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`⚠️ Blocked CORS request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Disposition', 'Content-Length', 'Content-Type'],
  maxAge: 86400 // 24 hours
}));

// ============ BODY PARSERS ============
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// ============ STATIC FILE SERVING ============
// Absolute path to uploads folder
const uploadsPath = path.join(__dirname, 'uploads');
console.log(`📁 Uploads directory: ${uploadsPath}`);

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log('📁 Created uploads directory');
}

// Create subdirectories
const subDirs = ['documents', 'software', 'screenshots'];
subDirs.forEach(dir => {
  const dirPath = path.join(uploadsPath, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Created ${dir} directory`);
  }
});

// Serve static files
app.use('/uploads', express.static(uploadsPath, {
  setHeaders: (res, filePath) => {
    // Set proper content types for images and files
    if (filePath.endsWith('.png')) res.setHeader('Content-Type', 'image/png');
    else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) res.setHeader('Content-Type', 'image/jpeg');
    else if (filePath.endsWith('.gif')) res.setHeader('Content-Type', 'image/gif');
    else if (filePath.endsWith('.webp')) res.setHeader('Content-Type', 'image/webp');
    else if (filePath.endsWith('.pdf')) res.setHeader('Content-Type', 'application/pdf');
    else if (filePath.endsWith('.zip')) res.setHeader('Content-Type', 'application/zip');
    else if (filePath.endsWith('.rar')) res.setHeader('Content-Type', 'application/x-rar-compressed');
    else if (filePath.endsWith('.exe')) res.setHeader('Content-Type', 'application/vnd.microsoft.portable-executable');
    
    // Cache control for static assets
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    // Allow CORS for static files
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

// ============ DEBUG ENDPOINTS ============
// Check if a file exists in uploads
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
      fullUrl: `${BASE_URL}/uploads/${type}/${filename}`
    });
  } else {
    // List files in directory to help debug
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
    environment: NODE_ENV,
    server: BASE_URL,
    port: PORT,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uploadPath: uploadsPath,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0'
  });
});

// ============ API INFO ============
app.get('/api', (req, res) => {
  res.json({
    name: 'DocuSoft API',
    version: '1.0.0',
    status: 'running',
    environment: NODE_ENV,
    server: BASE_URL,
    endpoints: {
      auth: `${BASE_URL}/api/auth`,
      categories: `${BASE_URL}/api/categories`,
      documents: `${BASE_URL}/api/documents`,
      software: `${BASE_URL}/api/software`,
      payments: `${BASE_URL}/api/payments`,
      orders: `${BASE_URL}/api/orders`,
      admin: `${BASE_URL}/api/admin`,
      settings: `${BASE_URL}/api/settings`,
      health: `${BASE_URL}/health`
    },
    documentation: 'Contact support for API documentation',
    timestamp: new Date().toISOString()
  });
});

// ============ ROOT ROUTE ============
app.get('/', (req, res) => {
  res.json({ 
    message: 'DocuSoft API Server Running',
    version: '1.0.0',
    server: BASE_URL,
    health: `${BASE_URL}/health`,
    api: `${BASE_URL}/api`,
    timestamp: new Date().toISOString()
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

// ============ CONNECT TO DATABASE AND START SERVER ============
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log('\n' + '='.repeat(70));
      console.log('🚀 DocuSoft Server Running');
      console.log('='.repeat(70));
      console.log(`📍 Environment: ${NODE_ENV}`);
      console.log(`🔗 Server URL: ${BASE_URL}`);
      console.log(`🌐 API Endpoint: ${BASE_URL}/api`);
      console.log(`💚 Health Check: ${BASE_URL}/health`);
      console.log(`📁 Uploads Directory: ${uploadsPath}`);
      console.log(`💾 MongoDB: ${mongoose.connection.name} (${mongoose.connection.host})`);
      console.log(`📡 Port: ${PORT}`);
      console.log(`🕐 Started at: ${new Date().toISOString()}`);
      console.log('='.repeat(70));
      
      // Log CORS allowed origins
      console.log('\n🌍 CORS Allowed Origins:');
      allowedOrigins.forEach(origin => {
        if (origin instanceof RegExp) {
          console.log(`   - ${origin.toString()}`);
        } else {
          console.log(`   - ${origin}`);
        }
      });
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
      
      // Force close after 10 seconds
      setTimeout(() => {
        console.error('⚠️ Could not close connections in time, forcing shutdown');
        process.exit(1);
      }, 10000);
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;